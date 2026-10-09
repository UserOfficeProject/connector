import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';

import { getAxiosErrorDetails } from './getAxiosErrorDetails';

describe('getAxiosErrorDetails', () => {
  it.each([
    {
      Message: 'Authentication failed',
      InnerException: { Message: 'User disabled' },
    },
    'Authentication failed',
    '401',
  ])('should preserve the full server response body: %p', (data) => {
    const config = {
      method: 'post',
      baseURL: 'https://one-identity.example.org',
      url: '/auth/apphost',
      headers: new AxiosHeaders({ Cookie: 'secret-cookie' }),
      data: { password: 'secret-password' },
    };
    const response: AxiosResponse = {
      status: 401,
      statusText: 'Unauthorized',
      headers: { 'www-authenticate': 'apphost' },
      config,
      data,
    };
    const error = new AxiosError(
      'Request failed',
      undefined,
      config,
      undefined,
      response
    );

    expect(getAxiosErrorDetails(error)).toEqual({
      request: {
        method: 'POST',
        baseURL: config.baseURL,
        url: config.url,
      },
      response: {
        status: 401,
        statusText: 'Unauthorized',
        headers: response.headers,
        data,
      },
    });
  });

  it('should handle Axios errors without a response', () => {
    const error = new AxiosError('Network error');

    expect(getAxiosErrorDetails(error)).toEqual({
      request: { method: undefined, baseURL: undefined, url: undefined },
      response: {
        status: undefined,
        statusText: undefined,
        headers: undefined,
        data: undefined,
      },
    });
  });

  it('should not extract HTTP details from other errors', () => {
    expect(getAxiosErrorDetails(new Error('Processing failed'))).toEqual({});
    expect(getAxiosErrorDetails(undefined)).toEqual({});
  });
});
