import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "sbjitmr-gatepass-secret-key-2024",
);

export type Role = "student" | "mentor" | "hod" | "security" | "admin";

export interface SessionPayload {
  uid: number;
  role: Role;
  name: string;
  identifier: string;
  department?: string | null;
  semester?: number | null;
  section?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    uid: payload.uid,
    role: payload.role,
    name: payload.name,
    identifier: payload.identifier,
    department: payload.department ?? null,
    semester: payload.semester ?? null,
    section: payload.section ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get("gp_session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set("gp_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete("gp_session");
}

export async function findUserByIdentifier(
  identifier: string,
  role: Role,
): Promise<typeof users.$inferSelect | undefined> {
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.identifier, identifier), eq(users.role, role)))
    .limit(1);
  return rows[0];
}

export async function findUserById(
  id: number,
): Promise<typeof users.$inferSelect | undefined> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}
