import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const scrypt = promisify(scryptCallback);

export const SESSION_COOKIE_NAME = "resume_optimizer_session";
const SESSION_DURATION_MS = env.SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;
const SESSION_REFRESH_THRESHOLD_MS = env.SESSION_REFRESH_THRESHOLD_HOURS * 60 * 60 * 1000;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, originalHash] = storedHash.split(":");

  if (!salt || !originalHash) {
    return false;
  }

  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const original = Buffer.from(originalHash, "hex");

  if (derived.length !== original.length) {
    return false;
  }

  return timingSafeEqual(derived, original);
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt
    }
  });

  return { token, expiresAt };
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/"
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/"
  });
}

async function refreshSessionIfNeeded(params: {
  session: {
    id: string;
    expiresAt: Date;
  };
  token: string;
}) {
  const refreshDeadline = Date.now() + SESSION_REFRESH_THRESHOLD_MS;

  if (params.session.expiresAt.getTime() > refreshDeadline) {
    return params.session.expiresAt;
  }

  const nextExpiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.update({
    where: { id: params.session.id },
    data: {
      expiresAt: nextExpiresAt
    }
  });

  const cookieStore = await cookies();
  try {
    cookieStore.set({
      name: SESSION_COOKIE_NAME,
      value: params.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: nextExpiresAt,
      path: "/"
    });
  } catch {
    // Some read-only render contexts cannot mutate cookies.
  }

  return nextExpiresAt;
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true }
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  const refreshedExpiresAt = await refreshSessionIfNeeded({
    session,
    token
  });

  if (refreshedExpiresAt.getTime() !== session.expiresAt.getTime()) {
    session.expiresAt = refreshedExpiresAt;
  }

  return session;
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireCurrentUserId() {
  const user = await requireCurrentUser();
  return user.id;
}

export async function deleteSessionByToken(token: string) {
  await prisma.session.deleteMany({
    where: { tokenHash: hashSessionToken(token) }
  });
}

export async function deleteSessionsByUserId(userId: string) {
  await prisma.session.deleteMany({
    where: { userId }
  });
}

export async function deleteExpiredSessions() {
  await prisma.session.deleteMany({
    where: { expiresAt: { lte: new Date() } }
  });
}
