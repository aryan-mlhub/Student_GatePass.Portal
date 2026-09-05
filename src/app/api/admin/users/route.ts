import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ne } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { mockStore } from "@/lib/mock-db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const rows = await db
      .select()
      .from(users)
      .where(ne(users.role, "student"));
    if (rows && rows.length > 0) {
      return NextResponse.json({ users: rows });
    }
  } catch (err) {
    console.warn("[Admin Users DB Notice] Using memory store fallback.", err);
  }

  const staff = mockStore.users.filter((u) => u.role !== "student");
  return NextResponse.json({ users: staff });
}
