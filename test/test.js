import chai from 'chai'
import nock from 'nock'
import es6promise from 'es6-promise'
const expect = chai.expect

es6promise.polyfill()
import jsonFetch from '..'

describe('jsonFetch',() => {
  it('resolves with json body for 200-level status codes', () => {
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

  it('resolves with undefined for 404 status code', () => {
    nock('http://www.test.com')
      .get('/products/1234')
      .reply(404, 'not found')
    return jsonFetch('http://www.test.com/products/1234').then((response) => {
      expect(response.body).to.equal(undefined)
      expect(response.status).to.equal(404)
      expect(response.statusText).to.equal('Not Found')
      expect(response.headers).to.be.ok
    })
  })

  it('rejects with an error for all other status codes', () => {
    nock('http://www.test.com')
      .get('/products/1234')
      .reply(500, 'Something went wrong')
    return jsonFetch('http://www.test.com/products/1234').catch((err) => {
      expect(err.message).to.deep.equal('Internal Server Error')
      expect(err.body).to.deep.equal('Something went wrong')
      expect(err.status).to.equal(500)
      expect(err.statusText).to.equal('Internal Server Error')
      expect(err.headers).to.be.ok
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
