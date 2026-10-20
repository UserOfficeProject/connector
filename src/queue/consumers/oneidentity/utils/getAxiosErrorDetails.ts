import { isAxiosError } from 'axios';

export function getAxiosErrorDetails(error: unknown) {
  if (!isAxiosError(error)) return {};

  // Do not log request headers or data: they can contain session cookies and passwords.
  return {
    request: {
      method: error.config?.method?.toUpperCase(),
      baseURL: error.config?.baseURL,
      url: error.config?.url,
    },
    response: {
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      data: error.response?.data,
    },
  };
}
