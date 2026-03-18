import { createClient } from "https://esm.sh/@supabase/supabase-js@2/dist/index.d.mts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create admin user
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email: "admin@crmfyviza.com",
      password: "Admin123!",
      email_confirm: true,
    });

    if (createError && !createError.message.includes("already")) {
      throw createError;
    }

    const userId = user?.user?.id;

    if (userId) {
      // Assign admin role
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

      if (roleError) throw roleError;
    }

    return new Response(
      JSON.stringify({ success: true, message: "Admin user created", email: "admin@crmfyviza.com" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
