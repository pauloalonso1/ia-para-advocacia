import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  action: "create" | "delete";
  name: string;
  email: string;
  password?: string;
  phone?: string;
  oab_number?: string;
  specialty?: string;
  role?: string;
  team_member_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateUserRequest = await req.json();

    if (body.action === "create") {
      const { name, email, password, phone, oab_number, specialty, role } = body;

      if (!name || !email || !password) {
        return new Response(
          JSON.stringify({ error: "Nome, email e senha são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (password.length < 6) {
        return new Response(
          JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create auth user
      const { data: authData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

      if (createError) {
        console.error("Error creating auth user:", createError);
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newUserId = authData.user.id;

      // Create team_member linked to the new auth user
      const { data: memberData, error: memberError } = await supabase
        .from("team_members")
        .insert({
          owner_id: caller.id,
          user_id: newUserId,
          name,
          email,
          phone: phone || null,
          oab_number: oab_number || null,
          specialty: specialty || null,
          is_active: true,
        })
        .select()
        .single();

      if (memberError) {
        console.error("Error creating team member:", memberError);
        // Rollback: delete the auth user
        await supabase.auth.admin.deleteUser(newUserId);
        return new Response(
          JSON.stringify({ error: memberError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Assign role
      const userRole = role || "lawyer";
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: newUserId,
          role: userRole,
        });

      if (roleError) {
        console.error("Error assigning role:", roleError);
        // Non-critical, don't rollback
      }

      return new Response(
        JSON.stringify({ success: true, member: memberData, user_id: newUserId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.action === "delete") {
      const { team_member_id } = body;
      if (!team_member_id) {
        return new Response(
          JSON.stringify({ error: "team_member_id é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get member to find user_id
      const { data: member, error: fetchError } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("id", team_member_id)
        .single();

      if (fetchError) {
        return new Response(
          JSON.stringify({ error: "Membro não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete team member
      const { error: deleteError } = await supabase
        .from("team_members")
        .delete()
        .eq("id", team_member_id);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete auth user if linked
      if (member.user_id) {
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(member.user_id);
        if (authDeleteError) {
          console.error("Error deleting auth user:", authDeleteError);
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
