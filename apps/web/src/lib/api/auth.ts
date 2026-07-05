import { NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";

/** 统一 JSON 错误响应 */
export function errorResponse(message: string, status = 400, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

/** 获取已认证用户，未登录返回 401 */
export async function requireUser() {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      supabase,
      error: errorResponse("未登录", 401, "UNAUTHORIZED"),
    };
  }
  return { user, supabase, error: null };
}

export type RequireUserResult = Awaited<ReturnType<typeof requireUser>>;
