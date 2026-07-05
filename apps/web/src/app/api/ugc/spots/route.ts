import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";

/** GET /api/ugc/spots — 公开景点查询（关键词可选） */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const supabase = createServerComponentClient();

  let query = supabase.from("spots").select("*").limit(20);
  if (q) query = query.ilike("name", `%${q}%`);

  const { data, error: err } = await query;
  if (err) return NextResponse.json([]);
  return NextResponse.json(data ?? []);
}
