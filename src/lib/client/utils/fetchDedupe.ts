const inFlight = new Map<string, Promise<Response>>();

function buildKey(input: RequestInfo | URL, init?: RequestInit) {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
  const method =
    init?.method ||
    (typeof input !== "string" && !(input instanceof URL)
      ? input.method
      : "GET");
  const body =
    typeof init?.body === "string" ? init?.body : init?.body ? "[body]" : "";
  return `${method} ${url} ${body}`;
}

export async function fetchDedupe(
  input: RequestInfo | URL,
  init?: RequestInit
) {
  const key = buildKey(input, init);
  const existing = inFlight.get(key);
  if (existing) return existing.then((res) => res.clone());

  const promise = fetch(input, init)
    .then((res) => {
      inFlight.delete(key);
      return res;
    })
    .catch((err) => {
      inFlight.delete(key);
      throw err;
    });

  inFlight.set(key, promise);
  return promise.then((res) => res.clone());
}
