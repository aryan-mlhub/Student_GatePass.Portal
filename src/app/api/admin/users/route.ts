import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ne } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const rows = await db
    .select()
    .from(users)
    .where(ne(users.role, "student"));
  return NextResponse.json({ users: rows });
}
