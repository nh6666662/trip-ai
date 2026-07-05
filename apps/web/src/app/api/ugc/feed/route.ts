import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/api/auth";
import type { UgcFeedItem } from "@/types/api";

/** GET /api/ugc/feed — 公开可读的 UGC 信息流 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "all";
  const limit = Number(searchParams.get("limit") ?? 20);

  // UGC 公开可读，无需登录
  const supabase = createServerComponentClient();

  let query = supabase
    .from("ugc_reports")
    .select(
      "*, spot:spots(id, name, image_url), author:user_profiles(display_name, avatar_url)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (type !== "all") {
    // 按内容关键词过滤：匹配对应分类的关键词
    const keywordMap: Record<string, string[]> = {
      crowd: ["人多", "拥挤", "人太", "爆满", "人山人海", "拥挤"],
      queue: ["排队", "排了", "等候", "等了", "等待", "排长队"],
      facility: ["故障", "维修", "停运", "装修", "关闭", "施工", "设施"],
    };
    const keywords = keywordMap[type] ?? [];
    // 使用 Supabase 的 or 条件查询
    if (keywords.length > 0) {
      const orFilter = keywords.map((k) => `content.ilike.%${k}%`).join(",");
      query = query.or(orFilter);
    }
  }

  const { data, error: err } = await query;
  if (err) return errorResponse(err.message, 500);

  const result: UgcFeedItem[] = (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const spot = row.spot as {
      id: string;
      name: string;
      image_url: string | null;
    } | null;
    const author = row.author as {
      display_name: string | null;
      avatar_url: string | null;
    } | null;
    const { spot: _s, author: _a, ...rest } = row;
    return {
      ...(rest as Omit<UgcFeedItem, "spot" | "author_name" | "author_avatar">),
      spot: spot
        ? { id: spot.id, name: spot.name, image_url: spot.image_url }
        : undefined,
      author_name: author?.display_name ?? null,
      author_avatar: author?.avatar_url ?? null,
    };
  });

  return NextResponse.json(result);
}
