// @flow
import 'goodeggs-test-helpers';

import {describe, it} from 'mocha';
import {expect} from 'goodeggs-test-helpers/chai';
// import sinon from 'sinon';
// import nock from 'nock';

import getRequestOptions from '.';

describe('getRequestOptions', async function () {
  it('populates an options object without undefined keys', function () {
    const expected = {
      headers: {
        Accept: 'application/json',
      },
    };
    const actual = getRequestOptions({});
    expect(actual).to.deep.equal(expected);
  });

  it('sets content type header only when there is a body', function () {
    const expected = {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: '{"hi":"hello"}',
    };
    const actual = getRequestOptions({body: {hi: 'hello'}});
    expect(actual).to.deep.equal(expected);
  });
});
