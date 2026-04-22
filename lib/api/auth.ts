// ─────────────────────────────────────────────────────────────────────────────
// Auth API — 공통 인터페이스
// web: @supabase/ssr getServerSession 등 다를 수 있음
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "@/lib/supabase";

export async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signInAnonymously() {
  return supabase.auth.signInAnonymously();
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
