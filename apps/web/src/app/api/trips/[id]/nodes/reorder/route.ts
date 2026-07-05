import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/api/auth";

type Params = { params: { id: string } };

/** POST /api/trips/:id/nodes/reorder — 拖拽重排序 */
export async function POST(req: NextRequest, { params }: Params) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const { data: trip } = await supabase
    .from("trips")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .single();
  if (!trip) return errorResponse("行程不存在", 404);

  const { orderedIds } = (await req.json()) as { orderedIds: string[] };
  if (!Array.isArray(orderedIds)) {
    return errorResponse("orderedIds 必须为数组", 400);
  }

  // 逐条更新 sort_order
  const updates = orderedIds.map((nodeId, index) =>
    supabase
      .from("trip_nodes")
      .update({ sort_order: index })
      .eq("id", nodeId)
      .eq("trip_id", params.id),
  );
  await Promise.all(updates);

  return NextResponse.json({ ok: true });
}
