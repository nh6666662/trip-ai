import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/api/auth";
import type { TripNodeInsert } from "@/types/database";

type Params = { params: { id: string } };

/** GET /api/trips/:id/nodes — 行程节点列表 */
export async function GET(_req: NextRequest, { params }: Params) {
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

  const { data, error: err } = await supabase
    .from("trip_nodes")
    .select("*")
    .eq("trip_id", params.id)
    .order("sort_order", { ascending: true });

  if (err) return errorResponse(err.message, 500);
  return NextResponse.json(data ?? []);
}

/** POST /api/trips/:id/nodes — 新增节点 */
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

  const body = (await req.json()) as TripNodeInsert;
  const { data, error: err } = await supabase
    .from("trip_nodes")
    .insert({
      trip_id: params.id,
      name: body.name,
      spot_id: body.spot_id ?? null,
      node_type: body.node_type ?? "custom",
      start_time: body.start_time,
      duration_minutes: body.duration_minutes,
      transit_minutes: body.transit_minutes ?? 0,
      sort_order: body.sort_order ?? 999,
      metadata: body.metadata ?? {},
    })
    .select()
    .single();

  if (err) return errorResponse(err.message, 400);
  return NextResponse.json(data);
}
