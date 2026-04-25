import { supabase } from "@/lib/supabase";
import type { UserSettings } from "@/lib/types";

export type WeekStartDay = "mon" | "sun";

export async function getSettings(): Promise<UserSettings | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("id", user.id)
    .single();
  return data as UserSettings | null;
}

export async function updateWeekStartDay(day: WeekStartDay) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요해요.");
  const { error } = await supabase
    .from("user_settings")
    .upsert({ id: user.id, week_start_day: day }, { onConflict: "id" });
  if (error) throw error;
}
