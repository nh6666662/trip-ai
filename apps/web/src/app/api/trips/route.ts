import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/api/auth";
import type { TripInsert } from "@/types/database";

/** GET /api/trips — 当前用户行程列表 */
export async function GET() {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const { data, error: err } = await supabase
    .from("trips")
    .select("*, trip_nodes(count)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  if (err) return errorResponse(err.message, 500);

  const result = (data ?? []).map((t) => {
    const { trip_nodes, ...rest } = t as { trip_nodes?: { count: number }[] };
    return { ...rest, node_count: trip_nodes?.[0]?.count ?? 0 };
  });

  return NextResponse.json(result);
}

/** POST /api/trips — 创建行程 */
export async function POST(req: NextRequest) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const body = (await req.json()) as TripInsert;
  if (!body.destination || !body.start_date || !body.end_date) {
    return errorResponse("目的地、起止日期不能为空", 400);
  }

  const { data, error: err } = await supabase
    .from("trips")
    .insert({
      user_id: user!.id,
      destination: body.destination,
      departure: body.departure ?? null,
      start_date: body.start_date,
      end_date: body.end_date,
      pace: body.pace ?? "relaxed",
      traveler_count: body.traveler_count ?? 1,
      preferences: body.preferences ?? null,
      status: "draft",
    })
    .select()
    .single();

  if (err) return errorResponse(err.message, 400);
  return NextResponse.json(data);
}
