import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/api/auth";

type Params = { params: { id: string } };

/** GET /api/trips/:id/alerts — 行程预警列表 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const { data: trip } = await supabase
    .from("trips")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .single();
  if (!trip) return errorResponse("行程不存在", 404);

  const { data, error: err } = await supabase
    .from("realtime_alerts")
    .select("*")
    .eq("trip_id", params.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (err) return errorResponse(err.message, 500);
  return NextResponse.json(data ?? []);
}
