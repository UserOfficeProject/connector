import axios, { AxiosHeaders, AxiosRequestConfig } from 'axios';
import { container, Lifecycle } from 'tsyringe';

export const mapClass = (
  type: symbol,
  clazz: any,
  lifecycle: Lifecycle = Lifecycle.Singleton
) => {
  container.register(
    type,
    {
      useClass: clazz,
    },
    { lifecycle: lifecycle }
  );
};

export const mapValue = <T>(type: symbol, value: T) => {
  container.register(type, {
    useValue: value,
  });
};

export const str2Bool = (i: string): boolean => {
  if (!i) return false;

  i = i.toLowerCase();

  return i === 'true' || i === '1';
};

export const axiosFetch = async (
  url: RequestInfo | URL,
  options?: RequestInit
): Promise<Response> => {
  const { method, headers, body } = options as RequestInit;
  const axiosOptions = {
    method,
    url,
    data: body,
    headers,
  } as AxiosRequestConfig;
  const axiosResponse = await axios(axiosOptions);

  const { data, status, statusText, headers: axiosHeaders } = axiosResponse;

  const responseHeaders = new AxiosHeaders(axiosHeaders as AxiosHeaders);

  const response = new Response(JSON.stringify(data), {
    status,
    statusText,
    headers: responseHeaders,
  });

  return response;
};
