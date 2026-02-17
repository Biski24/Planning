import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

export const SESSION_COOKIE_NAME = "planning_session";
const encoder = new TextEncoder();

type SessionPayload = {
  profileId: string;
  exp: number;
};

function base64UrlEncode(input: Uint8Array | string) {
  const bytes = typeof input === "string" ? encoder.encode(input) : input;
  const binary = Array.from(bytes)
    .map((byte) => String.fromCharCode(byte))
    .join("");
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return new Uint8Array([...binary].map((char) => char.charCodeAt(0)));
}

async function sign(data: string) {
  const secret = getEnv("SESSION_SECRET");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64UrlEncode(new Uint8Array(signature));
}

export async function createSessionToken(profileId: string, ttlSeconds = 60 * 60 * 24 * 14) {
  const payload: SessionPayload = {
    profileId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const payloadPart = base64UrlEncode(JSON.stringify(payload));
  const signaturePart = await sign(payloadPart);
  return `${payloadPart}.${signaturePart}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return null;

  const expected = await sign(payloadPart);
  if (expected !== signaturePart) return null;

  const payloadRaw = new TextDecoder().decode(base64UrlDecode(payloadPart));
  const payload = JSON.parse(payloadRaw) as SessionPayload;
  if (!payload.profileId || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

export async function getSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
