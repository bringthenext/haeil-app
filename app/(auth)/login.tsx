import * as AuthSession from "expo-auth-session";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { MigrationChoiceModal } from "@/components/haeil/MigrationChoiceModal";

import { signInAnonymously, signInWithApple, signInWithEmail, signUp } from "@/lib/api/auth";
import { checkMigrationNeeded, runMigration, type MigrationPolicy } from "@/lib/api/migration";
import { cancelDeletion, updateUsername } from "@/lib/api/profile";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/lib/supabase";

// OAuth 세션 완료 처리 (iOS)
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [migrationLoading, setMigrationLoading] = useState(false);

  const [error, setError] = useState("");

  // T15-1: 마이그레이션 모달 상태
  const [migrationCtx, setMigrationCtx] = useState<{
    anonUserId: string;
    anonAccessToken: string;
  } | null>(null);

  // 세션이 있으면 inbox로 이동. settings 등에서 명시적으로 push해 온 경우엔 리다이렉트하지 않음.
  useEffect(() => {
    if (!sessionLoading && session && !router.canGoBack()) {
      router.replace("/(app)/inbox");
    }
  }, [session, sessionLoading]);

  async function navigateAfterLogin() {
    const deletionState = await cancelDeletion();
    if (deletionState === "expired") {
      setError("탈퇴 처리된 계정이에요. 새 계정으로 가입해주세요.");
      return;
    }
    Toast.show({
      type: "success",
      text1: deletionState === "restored" ? "계정이 활성화되었습니다." : "로그인에 성공했습니다.",
    });
    router.replace("/(app)/inbox");
  }

  async function handleMigrationChoice(policy: MigrationPolicy) {
    if (!migrationCtx) return;
    setMigrationLoading(true);
    try {
      await runMigration(migrationCtx.anonUserId, migrationCtx.anonAccessToken, policy);
    } catch {
      // 마이그레이션 실패는 무시하고 진행 (데이터 손실 없이 실계정으로)
    } finally {
      setMigrationCtx(null);
      setMigrationLoading(false);
      await navigateAfterLogin();
    }
  }

  const handleSubmit = async () => {
    const e = email.trim();
    const p = password.trim();
    if (!e || !p) return;

    setLoading(true);
    setError("");
    try {
      const isAnon = session?.user?.is_anonymous ?? false;

      // ── 경로 A: 신규 가입 ────────────────────────────────────────────────────
      if (mode === "signup") {
        if (isAnon) {
          // anonymous → 실계정 업그레이드: user_id 그대로 유지
          const { error: updateError } = await supabase.auth.updateUser({ email: e, password: p });
          if (updateError) { setError(updateError.message); return; }
        } else {
          const result = await signUp(e, p);
          if (result.error) { setError(result.error.message); return; }
        }
        if (name.trim()) await updateUsername(name.trim());
        Toast.show({ type: "success", text1: "회원가입이 완료되었습니다." });
        router.replace("/(app)/inbox");
        return;
      }

      // ── 경로 B: 기존 계정 로그인 ────────────────────────────────────────────
      // 로그인 전 anon 세션 저장 (signInWithEmail 이전에 캡처해야 함)
      const anonUserId = isAnon ? (session?.user?.id ?? null) : null;
      const anonAccessToken = isAnon
        ? ((await supabase.auth.getSession()).data.session?.access_token ?? null)
        : null;

      const result = await signInWithEmail(e, p);
      if (result.error) { setError(result.error.message); return; }

      // signInWithEmail 결과에서 실계정 토큰 직접 추출 (싱글턴 타이밍 이슈 방지)
      const realAccessToken = result.data.session?.access_token ?? null;

      // 마이그레이션 체크
      if (anonUserId && anonAccessToken && realAccessToken) {
        try {
          const { anonHasData, realHasData } = await checkMigrationNeeded(
            anonUserId, anonAccessToken, realAccessToken,
          );

          if (anonHasData && realHasData) {
            // 4c: 양쪽 다 있음 → 모달로 선택
            setMigrationCtx({ anonUserId, anonAccessToken });
            return;
          } else if (anonHasData && !realHasData) {
            // 4b: anon만 있음 → 조용히 이전
            await runMigration(anonUserId, anonAccessToken, "keep-anon");
          }
          // 4a: anon 데이터 없음 → 그냥 진행
        } catch {
          // 체크 실패 → 안전하게 모달 표시 (데이터 손실 방지)
          setMigrationCtx({ anonUserId, anonAccessToken });
          return;
        }
      }

      await navigateAfterLogin();
    } catch {
      setError("오류가 발생했어요. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const redirectUri = AuthSession.makeRedirectUri({ scheme: "haeil" });

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (oauthError) throw oauthError;
      if (!data.url) throw new Error("OAuth URL을 받지 못했어요.");

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri,
      );

      if (result.type === "success") {
        const hashFragment = result.url.split("#")[1] ?? "";
        const params = new URLSearchParams(hashFragment);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
          const restored = await cancelDeletion();
          Toast.show({ type: "success", text1: restored ? "계정이 활성화되었습니다." : "로그인에 성공했습니다." });
          router.replace("/(app)/inbox");
        } else {
          const queryFragment = result.url.split("?")[1] ?? "";
          const qParams = new URLSearchParams(queryFragment);
          const qAccess = qParams.get("access_token");
          const qRefresh = qParams.get("refresh_token");
          if (qAccess && qRefresh) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: qAccess,
              refresh_token: qRefresh,
            });
            if (sessionError) throw sessionError;
            const deletionState = await cancelDeletion();
            if (deletionState === "expired") {
              setError("탈퇴 처리된 계정이에요. 새 계정으로 가입해주세요.");
              return;
            }
            Toast.show({ type: "success", text1: deletionState === "restored" ? "계정이 활성화되었습니다." : "로그인에 성공했습니다." });
            router.replace("/(app)/inbox");
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "구글 로그인에 실패했어요.";
      setError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setAppleLoading(true);
    setError("");
    try {
      const { error: err } = await signInWithApple();
      if (err) setError(err.message);
    } catch {
      setError("Apple 로그인에 실패했어요.");
    } finally {
      setAppleLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    setError("");
    try {
      const { error: err } = await signInAnonymously();
      if (err) {
        setError(err.message);
      } else {
        Toast.show({ type: "success", text1: "비회원으로 시작합니다." });
        router.replace("/(app)/inbox");
      }
    } catch {
      setError("비회원 로그인에 실패했어요.");
    } finally {
      setGuestLoading(false);
    }
  };


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <View className="flex-1 items-center justify-center px-6">
        {/* 로고 */}
        <Text className="mb-2 text-4xl font-bold text-primary">해일</Text>
        <Text className="mb-10 text-sm text-muted-foreground">
          할 일이 재난처럼 몰려와도 잘 처리해나가자
        </Text>

        {/* 이름 (회원가입 전용) */}
        {mode === "signup" && (
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="이름"
            placeholderTextColor="#94a3b8"
            autoCapitalize="words"
            className="mb-3 h-12 w-full max-w-sm rounded-xl border border-border bg-muted px-4 text-sm text-foreground"
          />
        )}

        {/* 이메일 */}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="이메일"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          keyboardType="email-address"
          className="mb-3 h-12 w-full max-w-sm rounded-xl border border-border bg-muted px-4 text-sm text-foreground"
        />

        {/* 비밀번호 */}
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="비밀번호"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          className="mb-4 h-12 w-full max-w-sm rounded-xl border border-border bg-muted px-4 text-sm text-foreground"
        />

        {/* 에러 */}
        {error ? (
          <Text className="mb-3 text-xs text-red-500">{error}</Text>
        ) : null}

        {/* 이메일 로그인/회원가입 */}
        <TouchableOpacity
          onPress={() => void handleSubmit()}
          disabled={loading || !email.trim() || !password.trim()}
          className="mb-4 h-12 w-full max-w-sm items-center justify-center rounded-xl bg-primary disabled:opacity-50"
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-sm font-semibold text-primary-foreground">
              {mode === "signin" ? "로그인" : "회원가입"}
            </Text>
          )}
        </TouchableOpacity>

        {/* 구분선 */}
        <View className="mb-4 w-full max-w-sm flex-row items-center gap-3">
          <View className="h-px flex-1 bg-border" />
          <Text className="text-xs text-muted-foreground">또는</Text>
          <View className="h-px flex-1 bg-border" />
        </View>

        {/* 구글 로그인 */}
        <TouchableOpacity
          onPress={() => void handleGoogleLogin()}
          disabled={googleLoading}
          className="mb-4 h-12 w-full max-w-sm flex-row items-center justify-center gap-2 rounded-xl border border-border bg-background disabled:opacity-50"
          activeOpacity={0.8}
        >
          {googleLoading ? (
            <ActivityIndicator color="#1D9E75" />
          ) : (
            <>
              <Text className="text-base font-bold" style={{ color: "#4285F4" }}>
                G
              </Text>
              <Text className="text-sm font-medium text-foreground">
                Google로 계속하기
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* 애플 로그인 — iOS 전용 */}
        {Platform.OS === "ios" && (
          <TouchableOpacity
            onPress={() => void handleAppleLogin()}
            disabled={appleLoading}
            className="mb-4 h-12 w-full max-w-sm flex-row items-center justify-center gap-2 rounded-xl bg-[#000000] disabled:opacity-50"
            activeOpacity={0.8}
          >
            {appleLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={{ fontSize: 16, color: "#ffffff", lineHeight: 20 }}></Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#ffffff" }}>
                  Apple로 계속하기
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* 비회원으로 시작 — 다른 버튼과 동일 레벨 */}
        <TouchableOpacity
          onPress={() => void handleGuestLogin()}
          disabled={guestLoading}
          className="mb-6 h-12 w-full max-w-sm flex-row items-center justify-center gap-2 rounded-xl border border-border bg-background disabled:opacity-50"
          activeOpacity={0.8}
        >
          {guestLoading ? (
            <ActivityIndicator color="#94a3b8" size="small" />
          ) : (
            <Text className="text-sm font-medium text-muted-foreground">
              비회원으로 시작하기
            </Text>
          )}
        </TouchableOpacity>

        {/* 모드 전환 */}
        <TouchableOpacity
          onPress={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          <Text className="text-xs text-muted-foreground">
            {mode === "signin"
              ? "계정이 없으신가요? 회원가입"
              : "이미 계정이 있으신가요? 로그인"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* T15-1: 마이그레이션 선택 모달 */}
      <MigrationChoiceModal
        visible={migrationCtx !== null}
        loading={migrationLoading}
        onKeepReal={() => void handleMigrationChoice("keep-real")}
        onKeepAnon={() => void handleMigrationChoice("keep-anon")}
      />
    </KeyboardAvoidingView>
  );
}
