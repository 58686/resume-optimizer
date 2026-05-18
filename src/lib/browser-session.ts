"use client";

const SESSION_COOKIE_NAME = "resume_optimizer_session";

export type BrowserSessionPayload = {
  sessionToken?: string;
  sessionExpiresAt?: string;
};

function buildSessionCookie(payload: BrowserSessionPayload) {
  if (!payload.sessionToken) {
    return null;
  }

  const expiresAt = payload.sessionExpiresAt ? new Date(payload.sessionExpiresAt) : null;
  const expires =
    expiresAt && !Number.isNaN(expiresAt.getTime())
      ? `; Expires=${expiresAt.toUTCString()}`
      : "";
  const secure = window.location.protocol === "https:" ? "; Secure" : "";

  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(payload.sessionToken)}; Path=/${expires}; SameSite=Lax${secure}`;
}

async function serverCookieAlreadyWorks() {
  try {
    const response = await fetch("/api/mobile/me", {
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json"
      }
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function ensureBrowserSessionCookie(payload: BrowserSessionPayload) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const cookie = buildSessionCookie(payload);

  if (!cookie || (await serverCookieAlreadyWorks())) {
    return;
  }

  document.cookie = cookie;
}
