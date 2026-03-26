import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface AuditLogParams {
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
}

export function useAuditLog() {
  const { user } = useAuth();

  const log = useCallback(
    async ({ action, entityType, entityId, details }: AuditLogParams) => {
      if (!user) return;

      // Get user name from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const userName = profile?.full_name || user.email || "Desconhecido";

      await supabase.from("audit_logs" as any).insert({
        user_id: user.id,
        user_name: userName,
        action,
        entity_type: entityType,
        entity_id: entityId || "",
        details,
      });
    },
    [user]
  );

  return { log };
}
