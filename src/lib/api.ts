export class ApiError extends Error {
  public status: number;
  public body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const request = async <T>(input: string, method: HttpMethod, options: RequestOptions = {}): Promise<T> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const response = await fetch(input, {
    ...options,
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: options.credentials ?? 'same-origin'
  });

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw new ApiError(
      payload?.message ?? `Request to ${input} failed with status ${response.status}.`,
      response.status,
      payload
    );
  }

  return payload as T;
};

export const apiClient = {
  get: <T>(input: string, options?: RequestOptions) => request<T>(input, 'GET', options),
  post: <T>(input: string, body?: unknown, options?: RequestOptions) =>
    request<T>(input, 'POST', { ...options, body }),
  put: <T>(input: string, body?: unknown, options?: RequestOptions) =>
    request<T>(input, 'PUT', { ...options, body }),
  patch: <T>(input: string, body?: unknown, options?: RequestOptions) =>
    request<T>(input, 'PATCH', { ...options, body }),
  delete: <T>(input: string, options?: RequestOptions) => request<T>(input, 'DELETE', options)
};
