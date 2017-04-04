// @flow
import 'goodeggs-test-helpers';

import {describe, it, beforeEach, afterEach} from 'mocha';
import {expect} from 'goodeggs-test-helpers/chai';
import sinon from 'sinon';
import nock from 'nock';

import jsonFetch, {retriers} from '../src';

describe('jsonFetch', async function () {
  describe('single request with no retry', async function () {
    it('resolves with json body for 200 status codes', async function () {
      nock('http://www.test.com')
        .get('/products/1234')
        .reply(200, {name: 'apple'});
      const response = await jsonFetch('http://www.test.com/products/1234');
      expect(response.body).to.deep.equal({name: 'apple'});
      expect(response.status).to.equal(200);
      expect(response.statusText).to.equal('OK');
      expect(response.headers).to.be.ok();
    });

    it('resolves with JSON body for 500 status codes', async function () {
      nock('http://www.test.com')
        .get('/products/1234')
        .reply(500, '"Something went wrong"', {'Content-Type': 'application/json'});
      const response = await jsonFetch('http://www.test.com/products/1234');
      expect(response.body).to.deep.equal('Something went wrong');
      expect(response.status).to.equal(500);
      expect(response.statusText).to.equal('Internal Server Error');
      expect(response.headers).to.be.ok();
    });

    it('resolves with JSON body when content-type contains other values but includes application/json', async function () {
      nock('http://www.test.com')
        .get('/products/1234')
        .reply(204, '[{}]', {'Content-Type': 'application/json; charset=utf-8'});
      const response = await jsonFetch('http://www.test.com/products/1234');
      expect(response.body).to.deep.equal([{}]);
    });

    it('resolves with non-JSON body', async function () {
      nock('http://www.test.com')
        .get('/products/1234')
        .reply(200, 'This is not JSON', {'Content-Type': 'text/plain'});
      const response = await jsonFetch('http://www.test.com/products/1234');
      expect(response.body).to.deep.equal('This is not JSON');
    });

    it('rejects when there is a connection error', async function () {
      this.stub(global, 'fetch', async function () {
        throw new Error('Something is broken!');
      });
      let errorThrown = false;
      try {
        await jsonFetch('http://www.test.com/products/1234');
      } catch (err) {
        errorThrown = true;
        expect(err.name).to.deep.equal('FetchNetworkError');
        expect(err.message).to.deep.equal('Something is broken!');
      }
      expect(errorThrown).to.be.true();
    });

    it('sends json request body', async function () {
      nock('http://www.test.com')
        .post('/products/1234', {name: 'apple'})
        .reply(201, {_id: '1234', name: 'apple'});
      const response = await jsonFetch('http://www.test.com/products/1234', {
        method: 'POST',
        body: {name: 'apple'},
      });
      expect(response.body).to.deep.equal({_id: '1234', name: 'apple'});
      expect(response.status).to.equal(201);
      expect(response.statusText).to.equal('Created');
      expect(response.headers).to.be.ok();
    });
  });

  describe('expected statuses', function () {
    it('errors with FetchUnexpectedStatus if the response has an unexpected status code', async function () {
      nock('http://www.test.com')
        .get('/products/1234')
        .reply(400, 'not found');
      try {
        await jsonFetch('http://www.test.com/products/1234', {expectedStatuses: [201]});
      } catch (err) {
        expect(err.name).to.equal('FetchUnexpectedStatusError');
        expect(err.message).to.equal('Unexpected fetch response status 400');
        expect(err.response).to.have.property('status', 400);
        expect(err.response).to.have.property('text', 'not found');
        return;
      }
      throw new Error('expected to throw');
    });

    it('returns a response with an expected status code', async function () {
      nock('http://www.test.com')
        .get('/products/1234')
        .reply(201, 'not found');
      const response = await jsonFetch('http://www.test.com/products/1234', {expectedStatuses: [201]});
      expect(response).to.have.property('status', 201);
    });

    it('returns a response without an expected status code', async function () {
      nock('http://www.test.com')
        .get('/products/1234')
        .reply(404, 'not found');
      const response = await jsonFetch('http://www.test.com/products/1234');
      expect(response).to.have.property('status', 404);
    });
  });

  describe('retry', async function () {
    beforeEach(() => {
      sinon.spy(global, 'fetch');
    });

    afterEach(() => {
      fetch.restore();
    });

    it('does not retry by default', async function () {
      nock('http://www.test.com')
        .get('/')
        .reply(200, {});
      await jsonFetch('http://www.test.com/');
      expect(fetch.callCount).to.equal(1);
    });

    it('does specified number of retries', async function () {
      nock('http://www.test.com')
        .get('/')
        .reply(200, {});
      try {
        await jsonFetch('http://www.test.com/', {
          shouldRetry: () => true,
          retry: {
            retries: 5,
            factor: 0,
          },
        });
      } catch (err) {
        expect(fetch.callCount).to.equal(6); // 5 retries + 1 original = 6
        return;
      }
      throw new Error('Should have failed');
    });

    it('respects the shouldRetry() function', async function () {
      nock('http://www.test.com')
        .get('/')
        .times(6)
        .reply(200, {});
      try {
        await jsonFetch('http://www.test.com/', {
          shouldRetry: () => fetch.callCount < 3,
          retry: {
            retries: 5,
            factor: 0,
          },
        });
      } catch (err) {
        throw new Error('Should not fail');
      }
      expect(fetch.callCount).to.equal(3); // 2 retries + 1 original = 3
    });

    it('respects the should retry function for a network error', async function () {
      fetch.restore(); // Don't double stub!
      sinon.stub(global, 'fetch').returns(Promise.reject(new Error('ECONRST')));
      try {
        await jsonFetch('foo.bar', {
          shouldRetry: () => true,
          retry: {
            retries: 5,
            factor: 0,
          },
        });
      } catch (err) {
        expect(fetch.callCount).to.equal(6);
        expect(err.message).to.equal('ECONRST');
        return;
      }
      throw new Error('Should have failed');
    });
  });

  describe('retriers', async function () {
    describe('.is5xx', async function () {
      it('accepts a 503 and 504 status codes', async function () {
        expect(retriers.is5xx(new Response('', {status: 503}))).to.equal(true);
        expect(retriers.is5xx(new Response('', {status: 504}))).to.equal(true);
      });

      it('rejects all other inputs', async function () {
        expect(retriers.is5xx(new Error())).to.equal(false);
        expect(retriers.is5xx(new Response('', {status: 200}))).to.equal(false);
        expect(retriers.is5xx(new Response('', {status: 400}))).to.equal(false);
        expect(retriers.is5xx(new Response('', {status: 404}))).to.equal(false);
        expect(retriers.is5xx(new Response('', {status: 499}))).to.equal(false);
        expect(retriers.is5xx(new Response('', {status: 500}))).to.equal(false);
        expect(retriers.is5xx(new Response('', {status: 501}))).to.equal(false);
        expect(retriers.is5xx(new Response('', {status: 502}))).to.equal(false);
      });

      describe('used within jsonFetch', async function () {
        afterEach(() => {
          fetch.restore();
        });

        it('attempts to retry on a 5xx error code', async function () {
          sinon.stub(global, 'fetch').returns(Promise.resolve({status: 503}));
          try {
            await jsonFetch('http://www.test.com/', {
              shouldRetry: retriers.is5xx,
              retry: {
                retries: 3,
                factor: 0,
              },
            });
          } catch (err) {
            expect(fetch.callCount).to.equal(4);
            return;
          }
          throw new Error('Should have failed');
        });
      });
    });

    describe('.isNetworkError', async function () {
      it('accepts any errors', async function () {
        expect(retriers.isNetworkError(new Error())).to.equal(true);
      });

      it('rejects any non errors', async function () {
        expect(retriers.isNetworkError(new Response('foo'))).to.equal(false);
        expect(retriers.isNetworkError(new Response(''))).to.equal(false);
        expect(retriers.isNetworkError(new Response('', {status: 200}))).to.equal(false);
        expect(retriers.isNetworkError(new Response('', {status: 500}))).to.equal(false);
      });

      describe('used within jsonFetch', async function () {
        afterEach(() => {
          fetch.restore();
        });

        it('attempts to retry on a network error', async function () {
          sinon.stub(global, 'fetch').returns(Promise.reject(new Error('ECONRST')));
          try {
            await jsonFetch('foo.bar', {
              shouldRetry: retriers.isNetworkError,
              retry: {
                retries: 5,
                factor: 0,
              },
            });
          } catch (err) {
            expect(fetch.callCount).to.equal(6);
            expect(err.message).to.equal('ECONRST');
            return;
          }
          throw new Error('Should have failed');
        });
      });
    });
  });

  describe('malformed json', async function () {
    it('throws error with malformed text', async function () {
      nock('http://www.test.com')
        .get('/products/1234')
        .reply(200, '{"name": "apple""}', {'Content-Type': 'application/json'});
      try {
        await jsonFetch('http://www.test.com/products/1234');
      } catch (err) {
        expect(err.message).to.equal('Unexpected string in JSON at position 16');
        return;
      }
      throw new Error('expected to throw');
    });
  });

  describe('missing content type', async function () {
    it('handles it gracefully', async function () {
      nock('http://www.test.com')
        .get('/products/1234')
        .reply(200, 'test', {});
      const response = await jsonFetch('http://www.test.com/products/1234');
      expect(response.body).to.equal('test');
    });
  });
});
