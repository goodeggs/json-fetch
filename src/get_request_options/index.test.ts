import fake from 'fake-eggs';
import {describe, it} from 'mocha';
import {expect} from 'goodeggs-test-helpers';

import getRequestOptions from '.';

describe('getRequestOptions', function () {
  it('populates an options object without undefined keys', function () {
    const expected = {
      credentials: 'include',
      headers: {
        accept: 'application/json',
      },
    };
    const actual = getRequestOptions({});
    expect(actual).to.deep.equal(expected);
  });

  it('sets content type header only when there is a body', function () {
    const expected = {
      credentials: 'include',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: '{"hi":"hello"}',
    };
    const actual = getRequestOptions({
      body: {
        hi: 'hello',
      },
    });
    expect(actual).to.deep.equal(expected);
  });
  it('includes whitelisted options', function () {
    const options = getRequestOptions({
      timeout: 123,
    });
    expect(options).to.have.property('timeout', 123);
  });

  it('excluded non-whitelisted options', function () {
    const options = getRequestOptions({foo: 'bar'} as never);

    expect(options).not.to.contain.keys('foo');
  });

  it('forwards `credentials` option when provided', function () {
    const credentials: RequestCredentials = fake.sample(['omit', 'same-origin']);

    const expected = {
      credentials,
      headers: {
        accept: 'application/json',
      },
    };

    const actual = getRequestOptions({credentials});
    expect(actual).to.deep.equal(expected);
  });
});
