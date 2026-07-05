import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/api/auth";

type Params = { params: { id: string } };

/** GET /api/trips/:id — 行程详情（含节点） */
export async function GET(_req: NextRequest, { params }: Params) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const { data: trip, error: err } = await supabase
    .from("trips")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .single();

  if (err) return errorResponse("行程不存在", 404);

  const { data: nodes } = await supabase
    .from("trip_nodes")
    .select("*")
    .eq("trip_id", params.id)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ trip, nodes: nodes ?? [] });
}

/** PATCH /api/trips/:id — 更新行程 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const body = await req.json();
  const { data, error: err } = await supabase
    .from("trips")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .select()
    .single();

  if (err) return errorResponse(err.message, 400);
  return NextResponse.json(data);
}

/** DELETE /api/trips/:id — 删除行程 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const { error: err } = await supabase
    .from("trips")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user!.id);

  if (err) return errorResponse(err.message, 400);
  return NextResponse.json({ id: params.id });
}
