import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const allowed = new Set(["search", "discover", "trending", "videos"]);
const text = (value: string | null, fallback = "") => (value || fallback).slice(0, 180);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return Response.json({ error: "Use GET for catalogue requests." }, { status: 405, headers: corsHeaders });

  const apiKey = Deno.env.get("TMDB_API_KEY");
  if (!apiKey) return Response.json({ error: "TMDB_API_KEY is not configured in Supabase Edge Function secrets." }, { status: 503, headers: corsHeaders });

  try {
    const incoming = new URL(req.url);
    const action = text(incoming.searchParams.get("action"));
    if (!allowed.has(action)) return Response.json({ error: "Unsupported catalogue action." }, { status: 400, headers: corsHeaders });

    let path = "";
    const params = new URLSearchParams();
    params.set("api_key", apiKey);
    params.set("language", "en-US");
    const page = Math.min(500, Math.max(1, Number(incoming.searchParams.get("page") || 1)));
    params.set("page", String(Number.isFinite(page) ? page : 1));

    if (action === "search") {
      const query = text(incoming.searchParams.get("query")).trim();
      if (!query) return Response.json({ error: "Search query is required." }, { status: 400, headers: corsHeaders });
      path = "/search/movie"; params.set("query", query);
    } else if (action === "discover") {
      path = "/discover/movie";
      const allowedParams = ["with_genres", "sort_by", "vote_count.gte", "primary_release_date.gte", "primary_release_date.lte", "with_original_language", "include_adult"];
      for (const key of allowedParams) {
        const value = incoming.searchParams.get(key);
        if (value) params.set(key, value.slice(0, 80));
      }
      params.set("include_adult", "false");
    } else if (action === "trending") {
      const window = incoming.searchParams.get("time_window") === "day" ? "day" : "week";
      path = `/trending/movie/${window}`;
    } else if (action === "videos") {
      const id = Number(incoming.searchParams.get("id"));
      if (!Number.isInteger(id) || id < 1) return Response.json({ error: "A valid movie id is required." }, { status: 400, headers: corsHeaders });
      path = `/movie/${id}/videos`;
      params.delete("page");
    }

    const upstream = await fetch(`https://api.themoviedb.org/3${path}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return Response.json({ error: data.status_message || "TMDB catalogue request failed." }, { status: upstream.status, headers: corsHeaders });
    }
    return Response.json(data, {
      headers: { ...corsHeaders, "Cache-Control": "public, max-age=120, s-maxage=300" },
    });
  } catch (_error) {
    return Response.json({ error: "Unexpected catalogue service error." }, { status: 500, headers: corsHeaders });
  }
});
