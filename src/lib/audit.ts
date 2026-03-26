import { supabase } from "@/integrations/supabase/client";

/**
 * Standalone audit logger that can be called from anywhere without hooks.
 * Gets the current user automatically.
 */
export async function logAuditEvent(params: {
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const userName = profile?.full_name || user.email || "Desconhecido";

    await supabase.from("audit_logs" as any).insert({
      user_id: user.id,
      user_name: userName,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || "",
      details: params.details,
    });
  } catch {
    // Silent fail - audit logging should never break the app
  }
}
