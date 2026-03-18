export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function withCorsJson(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: {
      ...corsHeaders,
      ...(init?.headers || {}),
    },
  });
}

export function withCorsText(text: string, init?: ResponseInit) {
  return new Response(text, {
    ...init,
    headers: {
      ...corsHeaders,
      ...(init?.headers || {}),
    },
  });
}

export function optionsResponse() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}