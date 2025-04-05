import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_KEY")!
);

// ADMIN_TOKEN for protecting admin endpoints
const ADMIN_TOKEN = Deno.env.get("ADMIN_TOKEN") || "your_secret_admin_password";

serve(async (req) => {
  const { pathname } = new URL(req.url);

  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE",
    "Content-Type": "application/json",
  };

  // [Existing /api/auth endpoint...]

  // ADMIN: List all codes (GET /api/codes)
  if (pathname === "/api/codes" && req.method === "GET") {
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${ADMIN_TOKEN}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    const { data } = await supabase
      .from("auth_codes")
      .select("*")
      .order("created_at", { ascending: false });

    return new Response(JSON.stringify(data), { headers });
  }

  // ADMIN: Add new code (POST /api/codes)
  if (pathname === "/api/codes" && req.method === "POST") {
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${ADMIN_TOKEN}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    const { code } = await req.json();
    const hash = await sha256(code);

    const { error } = await supabase
      .from("auth_codes")
      .insert([{ code_hash: hash }]);

    if (error) {
      return new Response(JSON.stringify({ error: "Code exists" }), { status: 400, headers });
    }

    return new Response(JSON.stringify({ success: true }), { headers });
  }

  // ADMIN: Delete code (DELETE /api/codes/:id)
  if (pathname.startsWith("/api/codes/") && req.method === "DELETE") {
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${ADMIN_TOKEN}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    const id = pathname.split("/").pop();
    const { error } = await supabase
      .from("auth_codes")
      .delete()
      .eq("id", id);

    if (error) {
      return new Response(JSON.stringify({ error: "Delete failed" }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ success: true }), { headers });
  }
});

// SHA-256 helper
async function sha256(text: string): Promise<string> {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}