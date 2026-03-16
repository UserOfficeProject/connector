import { str2Bool } from './utils';
jest.mock('axios', () => ({
  __esModule: true,
  default: jest.fn(() =>
    Promise.reject({
      response: {
        data: {
          error: 'Axios Fetch Error',
        },
      },
    })
  ),
  isAxiosError: jest.requireActual('axios').isAxiosError,
  AxiosHeaders: jest.requireActual('axios').AxiosHeaders,
}));

describe('utils', () => {
  beforeEach(() => {
    jest.resetModules();
  });
  it('Should able to create boolean config', () => {
    expect(str2Bool('true')).toBe(true);
    expect(str2Bool('True')).toBe(true);
    expect(str2Bool('1')).toBe(true);
    expect(str2Bool('false')).toBe(false);
    expect(str2Bool('False')).toBe(false);
    expect(str2Bool('0')).toBe(false);
    expect(str2Bool('othervalue')).toBe(false);
    expect(str2Bool('10')).toBe(false);
  });

  it('axiosFetch function should throw correct error message', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const axiosFetch = require('./utils').axiosFetch;
    const url = 'http://example.com';
    const option = {
      method: 'GET',
      headers: {},
      body: '',
    };

    expect.assertions(1);

    await expect(axiosFetch(url, option)).rejects.toEqual({
      response: {
        data: {
          error: 'Axios Fetch Error',
        },
      },
    });
  });
});
