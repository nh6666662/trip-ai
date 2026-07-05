import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/api/auth";

type Params = { params: { id: string; nodeId: string } };

/** PATCH /api/trips/:id/nodes/:nodeId — 更新节点 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  // 校验行程归属
  const { data: trip } = await supabase
    .from("trips")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .single();
  if (!trip) return errorResponse("行程不存在", 404);

  const body = await req.json();
  const { data, error: err } = await supabase
    .from("trip_nodes")
    .update(body)
    .eq("id", params.nodeId)
    .eq("trip_id", params.id)
    .select()
    .single();

  if (err) return errorResponse(err.message, 400);
  return NextResponse.json(data);
}

/** DELETE /api/trips/:id/nodes/:nodeId — 删除节点 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const { data: trip } = await supabase
    .from("trips")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .single();
  if (!trip) return errorResponse("行程不存在", 404);

  const { error: err } = await supabase
    .from("trip_nodes")
    .delete()
    .eq("id", params.nodeId)
    .eq("trip_id", params.id);

  if (err) return errorResponse(err.message, 400);
  return NextResponse.json({ id: params.nodeId });
}
