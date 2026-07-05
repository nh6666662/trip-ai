import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/api/auth";

type Params = { params: { id: string; alertId: string } };

/** PATCH /api/trips/:id/alerts/:alertId — 采纳/忽略预警 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const { data: trip } = await supabase
    .from("trips")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .single();
  if (!trip) return errorResponse("行程不存在", 404);

  const body = await req.json();
  // 透传拒绝原因与时间戳，未提供时为 undefined（Supabase 不会更新该字段）
  const { data, error: err } = await supabase
    .from("realtime_alerts")
    .update({
      status: body.status,
      dismiss_reason: body.dismiss_reason,
      dismissed_at: body.dismissed_at,
    })
    .eq("id", params.alertId)
    .eq("trip_id", params.id)
    .select()
    .single();

  if (err) return errorResponse(err.message, 400);
  return NextResponse.json(data);
}
