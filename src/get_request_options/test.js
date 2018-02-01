// @flow
import {describe, it} from 'mocha';
import {expect} from 'goodeggs-test-helpers';

import getRequestOptions from '.';

describe('getRequestOptions', async function () {
  it('populates an options object without undefined keys', function () {
    const expected = {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    };
    const actual = getRequestOptions({});
    expect(actual).to.deep.equal(expected);
  });

  it('sets content type header only when there is a body', function () {
    const expected = {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: '{"hi":"hello"}',
    };
    const actual = getRequestOptions({body: {hi: 'hello'}});
    expect(actual).to.deep.equal(expected);
  });

  it('includes whitelisted options', function () {
    const options = getRequestOptions({timeout: 123});
    expect(options).to.have.property('timeout', 123);
  });

  it('excluded non-whitelisted options', function () {
    const options = getRequestOptions({foo: 'bar'});
    expect(options).not.to.contain.key('foo');
  });
});
