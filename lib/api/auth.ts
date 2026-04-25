// ─────────────────────────────────────────────────────────────────────────────
// Auth API — 공통 인터페이스
// web: @supabase/ssr getServerSession 등 다를 수 있음
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

export const SKIP_ANONYMOUS_KEY = "skip_anonymous_signin";

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
  await AsyncStorage.setItem(SKIP_ANONYMOUS_KEY, "1");
  return supabase.auth.signOut();
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Apple 로그인 — TODO: 구현 필요
 *
 * 구현 순서:
 * 1. `expo-apple-authentication`으로 credential 획득
 *    const credential = await AppleAuthentication.signInAsync({ requestedScopes: [...] })
 * 2. identity token으로 Supabase signInWithIdToken 호출
 *    supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken })
 * 3. Supabase 대시보드 > Auth > Providers > Apple 활성화 필요
 *    (Services ID, Team ID, Key ID, Private Key 설정)
 * 4. iOS App ID에 "Sign In with Apple" capability 추가 (EAS Build 환경에서 처리)
 */
export async function signInWithApple(): Promise<{ error: Error | null }> {
  // TODO: implement
  return { error: new Error("Apple 로그인은 아직 구현되지 않았습니다.") };
}
