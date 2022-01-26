import 'isomorphic-fetch';
import {describe, it, beforeEach, afterEach} from 'mocha';
import {expect, useSinonSandbox} from 'goodeggs-test-helpers';
import nock from 'nock';

import jsonFetch, {retriers} from '.';

declare global {
  // We are just extending this existing NodeJS namespace in order to test and create stubs with
  // Sinon, actually, `isomorphic-fetch` already populates the global scope with a `fetch` instance
  // but Typescript definitions doesn't match this behavior by now.
  // @see https://github.com/DefinitelyTyped/DefinitelyTyped/blob/f7ec78508c6797e42f87a4390735bc2c650a1bfd/types/isomorphic-fetch/index.d.ts
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      fetch: typeof fetch;
    }
  }
}

describe('jsonFetch', function () {
  const {sandbox} = useSinonSandbox();
  describe('single request with no retry', function () {
    it('resolves with json body for 200 status codes', async function () {
      nock('http://www.test.com').get('/products/1234').reply(200, {
        name: 'apple',
      });
      const response = await jsonFetch('http://www.test.com/products/1234');
      expect(response.body).to.deep.equal({
        name: 'apple',
      });
      expect(response.status).to.equal(200);
      expect(response.statusText).to.equal('OK');
      expect(response.headers).to.be.ok();
    });

    it('resolves with JSON body for 500 status codes', async function () {
      nock('http://www.test.com').get('/products/1234').reply(500, '"Something went wrong"', {
        'Content-Type': 'application/json',
      });
      const response = await jsonFetch('http://www.test.com/products/1234');
      expect(response.body).to.deep.equal('Something went wrong');
      expect(response.status).to.equal(500);
      expect(response.statusText).to.equal('Internal Server Error');
      expect(response.headers).to.be.ok();
    });
    it('resolves with JSON body when content-type contains other values but includes application/json', async function () {
      nock('http://www.test.com').get('/products/1234').reply(204, '[{}]', {
        'Content-Type': 'application/json; charset=utf-8',
      });
      const response = await jsonFetch('http://www.test.com/products/1234');
      expect(response.body).to.deep.equal([{}]);
    });

    it('resolves with non-JSON body', async function () {
      nock('http://www.test.com').get('/products/1234').reply(200, 'This is not JSON', {
        'Content-Type': 'text/plain',
      });
      const response = await jsonFetch('http://www.test.com/products/1234');
      expect(response.body).to.equal(undefined);
    });
    it('rejects when there is a connection error', async function () {
      sandbox.stub(global, 'fetch').callsFake(async function () {
        throw new Error('Something is broken!');
      });
      let errorThrown = false;

      try {
        await jsonFetch('http://www.test.com/products/1234');
      } catch (err) {
        errorThrown = true;
        expect(err.name).to.deep.equal('FetchError');
        expect(err.message).to.deep.equal('Something is broken!');
        expect(err.request.url).to.deep.equal('http://www.test.com/products/1234');
      }

      expect(errorThrown).to.be.true();
    });

    it('rejects with responseText when there is a json parse error', async function () {
      nock('http://www.test.com').get('/products/1234').reply(200, 'foo', {
        'Content-Type': 'application/json; charset=utf-8',
      });
      let errorThrown = false;

      try {
        await jsonFetch('http://www.test.com/products/1234');
      } catch (err) {
        errorThrown = true;
        expect(err.name).to.deep.equal('SyntaxError');
        expect(err.message).to.match(/Unexpected token/);
        expect(err.response.text).to.deep.equal('foo');
        expect(err.response.status).to.deep.equal(200);
        expect(err.request.url).to.deep.equal('http://www.test.com/products/1234');
      }

      expect(errorThrown).to.be.true();
    });

    it('sends json request body', async function () {
      nock('http://www.test.com')
        .post('/products/1234', {
          name: 'apple',
        })
        .reply(201, {
          _id: '1234',
          name: 'apple',
        });
      const response = await jsonFetch('http://www.test.com/products/1234', {
        method: 'POST',
        body: {
          name: 'apple',
        },
      });
      expect(response.body).to.deep.equal({
        _id: '1234',
        name: 'apple',
      });
      expect(response.status).to.equal(201);
      expect(response.statusText).to.equal('Created');
      expect(response.headers).to.be.ok();
    });
  });

  describe('expected statuses', function () {
    it('errors with FetchUnexpectedStatus if the response has an unexpected status code', async function () {
      nock('http://www.test.com').get('/products/1234').reply(400, 'not found');

      try {
        await jsonFetch('http://www.test.com/products/1234', {
          expectedStatuses: [201],
        });
      } catch (err) {
        expect(err.name).to.equal('FetchUnexpectedStatusError');
        expect(err.message).to.equal('Unexpected fetch response status 400');
        expect(err.request.url).to.equal('http://www.test.com/products/1234');
        expect(err.response).to.have.property('status', 400);
        expect(err.response).to.have.property('text', 'not found');
        return;
      }

      throw new Error('expected to throw');
    });

    it('returns a response with an expected status code', async function () {
      nock('http://www.test.com').get('/products/1234').reply(201, 'not found');
      const response = await jsonFetch('http://www.test.com/products/1234', {
        expectedStatuses: [201],
      });
      expect(response).to.have.property('status', 201);
    });
    it('returns a response without an expected status code', async function () {
      nock('http://www.test.com').get('/products/1234').reply(404, 'not found');
      const response = await jsonFetch('http://www.test.com/products/1234');
      expect(response).to.have.property('status', 404);
    });
  });

  describe('retry', function () {
    let fetchSpy: sinon.SinonSpy<
      [input: RequestInfo, init?: RequestInit | undefined],
      Promise<Response>
    >;

    beforeEach(() => {
      fetchSpy = sandbox.spy(global, 'fetch');
    });

    afterEach(() => {
      fetchSpy.restore();
    });

    it('does not retry by default', async function () {
      nock('http://www.test.com').get('/').reply(200, {});
      await jsonFetch('http://www.test.com/');
      expect(fetchSpy.callCount).to.equal(1);
    });

    it('does specified number of retries', async function () {
      nock('http://www.test.com').get('/').reply(200, {});

      try {
        await jsonFetch('http://www.test.com/', {
          shouldRetry: () => true,
          retry: {
            retries: 5,
            factor: 0,
          },
        });
      } catch (err) {
        expect(err.request.url).to.equal('http://www.test.com/');
        expect(err.request.retry.retries).to.equal(5);
        expect(fetchSpy.callCount).to.equal(6); // 5 retries + 1 original = 6

        return;
      }

      throw new Error('Should have failed');
    });

    it('respects the shouldRetry() function', async function () {
      nock('http://www.test.com').get('/').times(6).reply(200, {});

      try {
        await jsonFetch('http://www.test.com/', {
          shouldRetry: () => fetchSpy.callCount < 3,
          retry: {
            retries: 5,
            factor: 0,
          },
        });
      } catch (_err) {
        throw new Error('Should not fail');
      }

      expect(fetchSpy.callCount).to.equal(3); // 2 retries + 1 original = 3
    });
  });

  describe('retry network errors', function () {
    let fetchStub: sinon.SinonStub<
      [input: RequestInfo, init?: RequestInit | undefined],
      Promise<Response>
    >;

    beforeEach(() => {
      fetchStub = sandbox.stub(global, 'fetch');
    });

    afterEach(() => {
      fetchStub.restore();
    });

    it('respects the should retry function for a network error', async function () {
      fetchStub.rejects(new Error('ECONRST'));

      try {
        await jsonFetch('foo.bar', {
          shouldRetry: () => true,
          retry: {
            retries: 5,
            factor: 0,
          },
        });
      } catch (err) {
        expect(fetchStub.callCount).to.equal(6);
        expect(err.message).to.equal('ECONRST');
        return;
      }

      throw new Error('Should have failed');
    });

    it('adds the retryCount to the error', async function () {
      fetchStub.rejects(new Error('ECONRST'));

      try {
        await jsonFetch('foo.bar', {
          shouldRetry: () => true,
          retry: {
            retries: 5,
            factor: 0,
          },
        });
      } catch (err) {
        expect(fetchStub.callCount).to.equal(6);
        expect(err.message).to.equal('ECONRST');
        expect(err.retryCount).to.equal(5);
        return;
      }

      throw new Error('Should have failed');
    });

    it('call the onRequestStart and onRequestEnd functions in each retry', async function () {
      const onRequestStart = sandbox.spy(() => {});
      const onRequestEnd = sandbox.spy(() => {});

      try {
        await jsonFetch('foo.bar', {
          shouldRetry: () => true,
          retry: {
            retries: 5,
            factor: 0,
          },
          onRequestStart,
          onRequestEnd,
        });
      } catch {
        expect(onRequestStart.callCount).to.equal(6);
        expect(onRequestEnd.callCount).to.equal(6);
        return;
      }

      throw new Error('Should have failed');
    });
  });

  describe('retriers', function () {
    describe('.is5xx', function () {
      it('accepts a 503 and 504 status codes', async function () {
        expect(
          retriers.is5xx(
            new Response('', {
              status: 503,
            }),
          ),
        ).to.equal(true);
        expect(
          retriers.is5xx(
            new Response('', {
              status: 504,
            }),
          ),
        ).to.equal(true);
      });

      it('rejects all other inputs', async function () {
        expect(retriers.is5xx(new Error())).to.equal(false);
        expect(
          retriers.is5xx(
            new Response('', {
              status: 200,
            }),
          ),
        ).to.equal(false);
        expect(
          retriers.is5xx(
            new Response('', {
              status: 400,
            }),
          ),
        ).to.equal(false);
        expect(
          retriers.is5xx(
            new Response('', {
              status: 404,
            }),
          ),
        ).to.equal(false);
        expect(
          retriers.is5xx(
            new Response('', {
              status: 499,
            }),
          ),
        ).to.equal(false);
        expect(
          retriers.is5xx(
            new Response('', {
              status: 500,
            }),
          ),
        ).to.equal(false);
        expect(
          retriers.is5xx(
            new Response('', {
              status: 501,
            }),
          ),
        ).to.equal(false);
        expect(
          retriers.is5xx(
            new Response('', {
              status: 502,
            }),
          ),
        ).to.equal(false);
      });

      describe('used within jsonFetch', function () {
        let fetchStub: sinon.SinonStub<
          [input: RequestInfo, init?: RequestInit | undefined],
          Promise<{status: number}>
        >;

        beforeEach(() => {
          fetchStub = sandbox.stub(global, 'fetch');
        });

        afterEach(() => {
          fetchStub.restore();
        });

        it('attempts to retry on a 5xx error code', async function () {
          const is5xxSpy = sandbox.spy(retriers, 'is5xx');

          fetchStub.resolves({status: 503});

          try {
            await jsonFetch('http://www.test.com/', {
              shouldRetry: retriers.is5xx,
              retry: {
                retries: 3,
                factor: 0,
              },
            });
          } catch (_err) {
            expect(fetchStub.callCount).to.equal(4);
            expect(is5xxSpy.callCount).to.equal(4);
            return;
          }

          throw new Error('Should have failed');
        });
      });
    });

    describe('.isNetworkError', function () {
      it('accepts any errors', async function () {
        expect(retriers.isNetworkError(new Error())).to.equal(true);
      });

      it('rejects any non errors', async function () {
        expect(retriers.isNetworkError(new Response('foo'))).to.equal(false);
        expect(retriers.isNetworkError(new Response(''))).to.equal(false);
        expect(
          retriers.isNetworkError(
            new Response('', {
              status: 200,
            }),
          ),
        ).to.equal(false);
        expect(
          retriers.isNetworkError(
            new Response('', {
              status: 500,
            }),
          ),
        ).to.equal(false);
      });

      describe('used within jsonFetch', function () {
        let fetchStub: sinon.SinonStub<
          [input: RequestInfo, init?: RequestInit | undefined],
          Promise<{status: number}>
        >;

        beforeEach(() => {
          fetchStub = sandbox.stub(global, 'fetch');
        });

        afterEach(() => {
          fetchStub.restore();
        });

        it('attempts to retry on a network error', async function () {
          const isNetworkErrorSpy = sandbox.spy(retriers, 'isNetworkError');
          fetchStub.rejects(new Error('ECONRST'));

          try {
            await jsonFetch('foo.bar', {
              shouldRetry: retriers.isNetworkError,
              retry: {
                retries: 5,
                factor: 0,
              },
            });
          } catch (err) {
            expect(fetchStub.callCount).to.equal(6);
            expect(isNetworkErrorSpy.callCount).to.equal(6);
            expect(err.message).to.equal('ECONRST');
            return;
          }

          throw new Error('Should have failed');
        });
      });
    });
  });
  describe('malformed json', function () {
    it('throws error with malformed text', async function () {
      nock('http://www.test.com').get('/products/1234').reply(200, '{"name": "apple""}', {
        'Content-Type': 'application/json',
      });

      try {
        await jsonFetch('http://www.test.com/products/1234');
      } catch (err) {
        expect(err.message).to.contain('Unexpected string');
        return;
      }

      throw new Error('expected to throw');
    });
  });
  describe('missing content type', function () {
    it('handles it gracefully', async function () {
      nock('http://www.test.com').get('/products/1234').reply(200, 'test', {});
      const response = await jsonFetch('http://www.test.com/products/1234');
      expect(response.body).to.equal(undefined);
    });
  });
  describe('thrown errors', function () {
    it('does not include request headers', async function () {
      nock('http://www.test.com').get('/products/1234').reply(200, '{""}', {
        'Content-Type': 'application/json',
      });

      try {
        await jsonFetch('http://www.test.com/products/1234', {
          headers: {
            secret: 'foo',
          },
        });
      } catch (err) {
        expect(err.request.url).to.equal('http://www.test.com/products/1234');
        expect(err.request.headers).not.to.exist();
        return;
      }

      throw new Error('expected to throw');
    });
  });
});
