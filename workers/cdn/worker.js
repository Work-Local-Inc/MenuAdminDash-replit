export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const key = url.pathname.slice(1);

    if (!key) {
      return new Response("Menu CDN", { status: 200 });
    }

    // CORS headers for browser access
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === "GET") {
      const object = await env.MENU_IMAGES.get(key);
      if (!object) {
        return new Response("Not Found", { status: 404, headers: corsHeaders });
      }
      const headers = new Headers(corsHeaders);
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("cache-control", "public, max-age=31536000, immutable");
      return new Response(object.body, { headers });
    }

    // Auth required for writes
    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${env.UPLOAD_SECRET}`) {
      return new Response("Unauthorized", {
        status: 401,
        headers: corsHeaders,
      });
    }

    if (request.method === "PUT") {
      const contentType =
        request.headers.get("content-type") || "application/octet-stream";
      await env.MENU_IMAGES.put(key, request.body, {
        httpMetadata: { contentType },
      });
      return new Response(
        JSON.stringify({ key, url: `${url.origin}/${key}` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (request.method === "DELETE") {
      await env.MENU_IMAGES.delete(key);
      return new Response(JSON.stringify({ deleted: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  },
};
