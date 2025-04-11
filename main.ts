import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  {
    global: {
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
    },
  }
);

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Public routes
  if (url.pathname === "/api/login") {
    return handleLogin(req);
  }

  if (url.pathname === "/api/signup") {
    return handleSignup(req);
  }

  // Protected routes
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify JWT
  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser(token);
  if (error || !user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Admin-only routes
  if (url.pathname === "/api/admin/update-passcode") {
    if (!user.email?.endsWith("@admin.com")) {
      // Adjust your admin check
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return handleUpdatePasscode(req);
  }

  // Cipher routes
  if (url.pathname === "/api/encrypt") {
    return handleEncrypt(req);
  }

  if (url.pathname === "/api/decrypt") {
    return handleDecrypt(req);
  }

  return new Response("Not found", { status: 404 });
});

// Handler functions
async function handleLogin(req: Request) {
  const { email, password } = await req.json();
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleUpdatePasscode(req: Request) {
  const { newPasscode } = await req.json();
  // Update passcode in your database
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Add similar handlers for signup, encrypt, decrypt

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { action, passcode, newPasscode, message, shift1, shift2 } =
      await req.json();

    // Verify passcode for protected actions
    if (action !== "verify" && action !== "updatePasscode") {
      const { data, error } = await supabaseClient
        .from("cipher_auth")
        .select("passcode")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error || !data || data[0].passcode !== passcode) {
        return new Response(JSON.stringify({ error: "Invalid passcode" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
    }

    // Handle different actions
    switch (action) {
      case "verify":
        const { data } = await supabaseClient
          .from("cipher_auth")
          .select("passcode")
          .order("created_at", { ascending: false })
          .limit(1);

        const isValid = data && data[0]?.passcode === passcode;
        return new Response(JSON.stringify({ valid: isValid }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "updatePasscode":
        const { error } = await supabaseClient
          .from("cipher_auth")
          .insert([{ passcode: newPasscode }]);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "encrypt":
        const encrypted = encryptMessage(message, shift1, shift2);
        return new Response(JSON.stringify({ result: encrypted }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "decrypt":
        const decrypted = decryptMessage(message, shift1, shift2);
        return new Response(JSON.stringify({ result: decrypted }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

// Cipher functions
function encryptMessage(message, shift1, shift2) {
  const substitutionMap = {
    A: "Q",
    B: "W",
    C: "E",
    D: "R",
    E: "T",
    F: "Y",
    G: "U",
    H: "I",
    I: "O",
    J: "P",
    K: "A",
    L: "S",
    M: "D",
    N: "F",
    O: "G",
    P: "H",
    Q: "J",
    R: "K",
    S: "L",
    T: "Z",
    U: "X",
    V: "C",
    W: "V",
    X: "B",
    Y: "N",
    Z: "M",
  };

  return message
    .toUpperCase()
    .split("")
    .map((char) => {
      if (/[A-Z]/.test(char)) {
        // First shift
        let encrypted = shiftChar(char, shift1);
        // Substitution
        encrypted = substitutionMap[encrypted] || encrypted;
        // Second shift
        encrypted = shiftChar(encrypted, shift2);
        return encrypted;
      }
      return char;
    })
    .join("");
}

function decryptMessage(message, shift1, shift2) {
  const inverseSubstitutionMap = {
    Q: "A",
    W: "B",
    E: "C",
    R: "D",
    T: "E",
    Y: "F",
    U: "G",
    I: "H",
    O: "I",
    P: "J",
    A: "K",
    S: "L",
    D: "M",
    F: "N",
    G: "O",
    H: "P",
    J: "Q",
    K: "R",
    L: "S",
    Z: "T",
    X: "U",
    C: "V",
    V: "W",
    B: "X",
    N: "Y",
    M: "Z",
  };

  return message
    .toUpperCase()
    .split("")
    .map((char) => {
      if (/[A-Z]/.test(char)) {
        // Reverse second shift
        let decrypted = shiftChar(char, -shift2);
        // Reverse substitution
        decrypted = inverseSubstitutionMap[decrypted] || decrypted;
        // Reverse first shift
        decrypted = shiftChar(decrypted, -shift1);
        return decrypted;
      }
      return char;
    })
    .join("");
}

function shiftChar(char, shift) {
  const base = "A".charCodeAt(0);
  const code = char.charCodeAt(0) - base;
  const shifted = (code + shift) % 26;
  return String.fromCharCode(((shifted + 26) % 26) + base);
}
