const ORIGIN = "menu-admin-v2-production.up.railway.app";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = ORIGIN;
    url.port = "";
    url.protocol = "https:";

    const newRequest = new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: "manual",
    });

    newRequest.headers.set("Host", ORIGIN);
    newRequest.headers.set("X-Original-Host", new URL(request.url).hostname);

    const response = await fetch(newRequest);

    const newResponse = new Response(response.body, response);
    newResponse.headers.set("X-Proxied-By", "cloudflare-worker");

    return newResponse;
  },
};
