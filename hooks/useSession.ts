import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ensureDefaultEnvelope } from "@/lib/api/envelopes";

const ensuredUserIds = new Set<string>();
const pendingEnsures = new Map<string, Promise<void>>();

async function ensureUserBootstrap(session: Session | null): Promise<void> {
  const userId = session?.user?.id;
  if (!userId || ensuredUserIds.has(userId)) return;

  let pending = pendingEnsures.get(userId);
  if (!pending) {
    pending = ensureDefaultEnvelope(userId)
      .then(() => {
        ensuredUserIds.add(userId);
      })
      .finally(() => {
        pendingEnsures.delete(userId);
      });
    pendingEnsures.set(userId, pending);
  }
  await pending;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await ensureUserBootstrap(session).catch(() => {});
      setSession(session);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        void ensureUserBootstrap(session).catch(() => {});
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  return { session, loading, userId: session?.user?.id ?? null };
}
