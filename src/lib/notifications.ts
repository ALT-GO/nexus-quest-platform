import { supabase } from "@/integrations/supabase/client";

/**
 * Send a notification to a user by their profile name.
 * Resolves the name → user_id via profiles table.
 */
export async function sendNotification(params: {
  recipientName: string;
  title: string;
  message: string;
  type?: "info" | "warning" | "success" | "task_assigned";
  link?: string;
}) {
  try {
    // Look up user_id from profiles by full_name
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("full_name", params.recipientName)
      .single();

    if (!profile) return; // User not found, skip silently

    await supabase.from("notifications" as any).insert({
      user_id: profile.id,
      title: params.title,
      message: params.message,
      type: params.type || "info",
      link: params.link || null,
    });
  } catch {
    // Silent fail — notifications should never break the app
  }
}
