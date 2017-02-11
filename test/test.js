import chai from 'chai'
import sinon from 'sinon';
import nock from 'nock'
import es6promise from 'es6-promise'
const expect = chai.expect

es6promise.polyfill()
import jsonFetch, {retriers} from '..'

describe('jsonFetch',() => {
  let sandbox

  beforeEach(() => sandbox = sinon.sandbox.create())
  afterEach(() => sandbox.restore())

  describe('single request with no retry', () => {
    it('resolves with json body for 200 status codes', () => {
      nock('http://www.test.com')
        .get('/products/1234')
        .reply(200, {name: 'apple'})
      return jsonFetch('http://www.test.com/products/1234').then((response) => {
        expect(response.body).to.deep.equal({name: 'apple'})
        expect(response.status).to.equal(200)
        expect(response.statusText).to.equal('OK')
        expect(response.headers).to.be.ok
      })
    })

    it('resolves with JSON body for 500 status codes', () => {
      nock('http://www.test.com')
        .get('/products/1234')
        .reply(500, '"Something went wrong"', {'Content-Type': 'application/json'})
      return jsonFetch('http://www.test.com/products/1234').then((response) => {
        expect(response.body).to.deep.equal('Something went wrong')
        expect(response.status).to.equal(500)
        expect(response.statusText).to.equal('Internal Server Error')
        expect(response.headers).to.be.ok
      })
    })

    it('resolves with JSON body when content-type contains other values but includes application/json', () => {
      nock('http://www.test.com')
        .get('/products/1234')
        .reply(204, '[{}]', {'Content-Type': 'application/json; charset=utf-8'})
      return jsonFetch('http://www.test.com/products/1234').then((response) => {
        expect(response.body).to.deep.equal([{}])
      })
    })

    it('resolves with non-JSON body', () => {
      nock('http://www.test.com')
        .get('/products/1234')
        .reply(200, 'This is not JSON', {'Content-Type': 'text/plain'})
      return jsonFetch('http://www.test.com/products/1234').then((response) => {
        expect(response.body).to.deep.equal('This is not JSON')
      })
    })

    it('rejects when there is a connection error', () => {
      sandbox.stub(global, 'fetch', () => {
        throw new Error('Something is broken!')
      });
      let errorThrown = false;
      return jsonFetch('http://www.test.com/products/1234')
      .catch((err) => {
        errorThrown = true;
        expect(err.message).to.deep.equal('Something is broken!');
      })
      .then(() => {
        expect(errorThrown).to.be.true();
      })
    })

    it('sends json request body', () => {
      nock('http://www.test.com')
        .post('/products/1234', {name: 'apple'})
        .reply(201, {_id: '1234', name: 'apple'})
      return jsonFetch('http://www.test.com/products/1234', {
        method: 'POST',
        body: {name: 'apple'}
      }).then((response) => {
        expect(response.body).to.deep.equal({_id: '1234', name: 'apple'})
        expect(response.status).to.equal(201)
        expect(response.statusText).to.equal('Created')
        expect(response.headers).to.be.ok
      })
    })
  })

  describe('retry', () => {
    beforeEach(() => {
      sinon.spy(global, 'fetch');
    });

    afterEach(() => {
      fetch.restore();
    });

    it('does not retry by default', () => {
      nock('http://www.test.com')
        .get('/')
        .reply(200, {});
      return jsonFetch('http://www.test.com/').then((response) => {
        expect(fetch.callCount).to.equal(1);
      });
    })

    it('does specified number of retries', () => {
      nock('http://www.test.com')
        .get('/')
        .reply(200, {});
      return jsonFetch('http://www.test.com/', {
          shouldRetry: () => true,
          retry: {
            retries: 5,
            factor: 0
          }
      })
      .then(() => { throw new Error('Should have failed'); })
      .catch(() => {
        expect(fetch.callCount).to.equal(6); // 5 retries + 1 original = 6
      });
    })

    it('respects the shouldRetry() function', () => {
        nock('http://www.test.com')
          .get('/')
          .times(6)
          .reply(200, {});
        return jsonFetch('http://www.test.com/', {
            shouldRetry: () => fetch.callCount < 3,
            retry: {
              retries: 5,
              factor: 0
            }
        })
        .catch(() => { throw new Error('Should not fail'); })
        .then((response) => {
          expect(fetch.callCount).to.equal(3); // 2 retries + 1 original = 3
        })
      })

    it('respects the should retry function for a network error', () => {
      fetch.restore(); // Don't double stub!
      sinon.stub(global, 'fetch').returns(Promise.reject(new Error('ECONRST')));
      return jsonFetch('foo.bar', {
        shouldRetry: () => true,
        retry: {
          retries: 5,
          factor: 0
       }
      })
      .then(() => { throw new Error('Should have failed'); })
      .catch((err) => {
        expect(fetch.callCount).to.equal(6);
        expect(err.message).to.equal('ECONRST');
      })
    })
  })

  describe('retriers', () => {
    describe('.is5xx', () => {
      it('accepts a 503 and 504 status codes', () => {
        expect(retriers.is5xx({status: 503})).to.equal(true);
        expect(retriers.is5xx({status: 504})).to.equal(true);
      });

      it('rejects all other inputs', () => {
        expect(retriers.is5xx(new Error())).to.equal(false);
        expect(retriers.is5xx({status: 200})).to.equal(false);
        expect(retriers.is5xx({status: 400})).to.equal(false);
        expect(retriers.is5xx({status: 404})).to.equal(false);
        expect(retriers.is5xx({status: 499})).to.equal(false);
        expect(retriers.is5xx({status: 500})).to.equal(false);
        expect(retriers.is5xx({status: 501})).to.equal(false);
        expect(retriers.is5xx({status: 502})).to.equal(false);
      });

      describe('used within jsonFetch', () => {
        afterEach(() => {
          fetch.restore();
        });

        it('attempts to retry on a 5xx error code', () => {
          sinon.stub(global, 'fetch').returns(Promise.resolve({status: 503}));
          return jsonFetch('http://www.test.com/', {
            shouldRetry: retriers.is5xx,
            retry: {
              retries: 3,
              factor: 0
            }
          })
          .then(() => { throw new Error('Should have failed'); })
          .catch((err) => {
            expect(fetch.callCount).to.equal(4);
          })
        });
      });
    });

    describe('.isNetworkError', () => {
      it('accepts any errors', () => {
        expect(retriers.isNetworkError(new Error())).to.equal(true);
      });

      it('rejects any non errors', () => {
        expect(retriers.isNetworkError('foo')).to.equal(false);
        expect(retriers.isNetworkError({})).to.equal(false);
        expect(retriers.isNetworkError({status: 200})).to.equal(false);
        expect(retriers.isNetworkError({status: 500})).to.equal(false);
      });

      describe('used within jsonFetch', () => {
        afterEach(() => {
          fetch.restore();
        });

        it('attempts to retry on a network error', () => {
          sinon.stub(global, 'fetch').returns(Promise.reject(new Error('ECONRST')));
          return jsonFetch('foo.bar', {
            shouldRetry: retriers.isNetworkError,
            retry: {
              retries: 5,
              factor: 0
            }
          })
          .then(() => { throw new Error('Should have failed'); })
          .catch((err) => {
            expect(fetch.callCount).to.equal(6);
            expect(err.message).to.equal('ECONRST');
          })
        });
      });
    });
  })

  describe('malformed json', () => {
    it('throws error with malformed text', () => {
      nock('http://www.test.com')
        .get('/products/1234')
        .reply(200, '{"name": "apple""}', {'Content-Type': 'application/json'})
      return jsonFetch('http://www.test.com/products/1234').catch((e) => {
        expect(e.response.text).to.equal('{"name": "apple""}')
      })
    })
  })

  describe('missing content type', () => {
    it('handles it gracefully', () => {
      nock('http://www.test.com')
        .get('/products/1234')
        .reply(200, 'test', {})
      return jsonFetch('http://www.test.com/products/1234').then((response) => {
        expect(response.body).to.equal('test')
      })
    })
  })
})
