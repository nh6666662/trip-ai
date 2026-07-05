"use client";

import * as React from "react";
import { QueryProvider } from "@/lib/query/provider";
import { Toaster } from "@/components/ui/toaster";
import { useSession } from "@/lib/hooks/use-session";

/** 客户端 Provider 聚合：Query + Toast + 会话同步 */
export function Providers({ children }: { children: React.ReactNode }) {
  // 同步 Supabase 认证状态到 session store
  useSession();
  return (
    <QueryProvider>
      {children}
      <Toaster />
    </QueryProvider>
  );
}
