"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useSessionStore } from "@/lib/stores/session-store";
import type { UserProfile } from "@/types/database";

/**
 * 同步 Supabase Auth 会话 → session store
 * 在 Client 端监听认证状态变化，并在首次登录时自动创建 user_profiles 行
 */
export function useSession() {
  const { setUser, setLoading, user } = useSessionStore();

  useEffect(() => {
    let mounted = true;
    const supabase = createBrowserClient();

    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          useSessionStore
            .getState()
            .setFallbackEmail(session.user.email ?? null);

          const { data: profile, error } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          // 行不存在（首次登录）→ 自动创建 user_profiles
          if (error && error.code === "PGRST116") {
            const { data: inserted } = await supabase
              .from("user_profiles")
              .insert({
                id: session.user.id,
                display_name:
                  session.user.user_metadata?.display_name ??
                  session.user.user_metadata?.full_name ??
                  null,
                avatar_url:
                  session.user.user_metadata?.avatar_url ?? null,
              })
              .select("*")
              .single();
            setUser((inserted as UserProfile) ?? null);
          } else {
            setUser((profile as UserProfile) ?? null);
          }
        } else {
          setUser(null);
        }
      } catch {
        if (mounted) setUser(null);
      }
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user };
}
