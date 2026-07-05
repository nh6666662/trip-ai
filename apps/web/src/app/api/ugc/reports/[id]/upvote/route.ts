import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/api/auth";

type Params = { params: { id: string } };

/** POST /api/ugc/reports/:id/upvote — 点赞 UGC */
export async function POST(_req: NextRequest, { params }: Params) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  // 先查询当前 upvotes（RLS 下作者可读，公开可读）
  const { data: report } = await supabase
    .from("ugc_reports")
    .select("upvotes")
    .eq("id", params.id)
    .single();

  const newCount = (report?.upvotes ?? 0) + 1;

  // 仅作者可改；这里用当前用户身份尝试（RLS 限制）
  const { data, error: err } = await supabase
    .from("ugc_reports")
    .update({ upvotes: newCount })
    .eq("id", params.id)
    .select()
    .single();

  if (err) {
    console.warn("[upvote] RLS blocked update:", err.message);
    return NextResponse.json(
      { error: "unable_to_upvote", message: "RLS blocked this update" },
      { status: 403 },
    );
  }
  return NextResponse.json({
    id: params.id,
    upvotes: data?.upvotes ?? newCount,
  });
}
