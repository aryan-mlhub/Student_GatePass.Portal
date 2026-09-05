import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";

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
  // 1. Try Clerk authentication first
  try {
    const clerkAuth = await auth();
    if (clerkAuth && clerkAuth.userId) {
      // Find user mapped by clerkId
      const mapped = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, clerkAuth.userId))
        .limit(1);

      if (mapped[0]) {
        const u = mapped[0];
        return {
          uid: u.id,
          role: u.role as Role,
          name: u.name,
          identifier: u.identifier,
          department: u.department ?? u.managedDepartment,
          semester: u.semester ?? u.managedSemester,
          section: u.section ?? u.managedSection,
        };
      }

      // If user exists in Clerk but not yet mapped in DB by clerkId, check Clerk user details
      const cUser = await currentUser();
      if (cUser) {
        const email = cUser.emailAddresses[0]?.emailAddress || "";
        const fullName = `${cUser.firstName || ""} ${cUser.lastName || ""}`.trim() || cUser.username || "Campus User";
        const metaRole = (cUser.publicMetadata?.role as Role) || "student";
        const metaIdentifier = (cUser.publicMetadata?.identifier as string) || email.split("@")[0] || clerkAuth.userId.slice(0, 10);

        // Attempt to find user by identifier or email
        const byIdentifier = await db
          .select()
          .from(users)
          .where(eq(users.identifier, metaIdentifier))
          .limit(1);

        if (byIdentifier[0]) {
          // Link clerkId
          await db
            .update(users)
            .set({ clerkId: clerkAuth.userId })
            .where(eq(users.id, byIdentifier[0].id));
          const u = byIdentifier[0];
          return {
            uid: u.id,
            role: u.role as Role,
            name: u.name,
            identifier: u.identifier,
            department: u.department ?? u.managedDepartment,
            semester: u.semester ?? u.managedSemester,
            section: u.section ?? u.managedSection,
          };
        }

        // Return session from Clerk user info
        return {
          uid: 0,
          role: metaRole,
          name: fullName,
          identifier: metaIdentifier,
          department: (cUser.publicMetadata?.department as string) || "Computer Science & Engineering",
          semester: Number(cUser.publicMetadata?.semester) || 3,
          section: (cUser.publicMetadata?.section as string) || "A",
        };
      }
    }
  } catch {
    // Clerk is either not configured or failed; fallback to local session cookie
  }

  // 2. Fallback to JWT session cookie
  try {
    const store = await cookies();
    const token = store.get("gp_session")?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
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

