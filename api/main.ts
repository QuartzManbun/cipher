// Deno serverless API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_KEY")!
);

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
      },
    });
  }

  const { pathname } = new URL(req.url);

  // Auth Endpoint
  if (pathname === "/api/auth" && req.method === "POST") {
    const { code } = await req.json();
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(code)
    );
    const hexHash = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    const { data } = await supabase
      .from("auth_codes")
      .select("*")
      .eq("code_hash", hexHash);

    if (!data?.length) {
      return new Response(
        JSON.stringify({ error: "Invalid code" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ token: "your_session_token" }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }

  // Other endpoints...
});