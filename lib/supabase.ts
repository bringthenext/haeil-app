// ─────────────────────────────────────────────────────────────────────────────
// Supabase 클라이언트 — native는 AsyncStorage, web은 localStorage 기반 세션
// Expo Router static export의 Node 렌더 단계에서는 no-op storage를 사용한다.
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const noopStorage = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
};

const webStorage = {
  getItem: (key: string) => Promise.resolve(globalThis.localStorage?.getItem(key) ?? null),
  setItem: (key: string, value: string) => {
    globalThis.localStorage?.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    globalThis.localStorage?.removeItem(key);
    return Promise.resolve();
  },
};

const storage =
  Platform.OS === "web"
    ? typeof globalThis.localStorage === "undefined"
      ? noopStorage
      : webStorage
    : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
