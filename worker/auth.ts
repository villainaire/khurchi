// worker/auth.ts
import * as jose from "jose";
import type { Env } from "./types";

const DEFAULT_JWT_SECRET = "khurchi_jwt_secret_mumbai_2026";

export async function signAdminToken(email: string, env: Env): Promise<string> {
  const secretString = env.JWT_SECRET || DEFAULT_JWT_SECRET;
  const secretKey = new TextEncoder().encode(secretString);

  const jwt = await new jose.SignJWT({
    sub: email,
    role: "admin",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);

  return jwt;
}

export async function verifyAdminToken(
  token: string,
  env: Env
): Promise<{ email: string; role: string } | null> {
  try {
    const secretString = env.JWT_SECRET || DEFAULT_JWT_SECRET;
    const secretKey = new TextEncoder().encode(secretString);

    const { payload } = await jose.jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    if (payload.role !== "admin" || !payload.sub) {
      return null;
    }

    return {
      email: payload.sub,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export function maskPhone(p: string): string {
  if (!p) return "";
  const len = p.length;
  if (len <= 4) return p;
  return p.slice(0, 2) + "*".repeat(Math.max(0, len - 4)) + p.slice(-2);
}

export function maskName(n: string): string {
  if (!n) return "";
  const parts = n.trim().split(/\s+/);
  return parts.map((part) => (part ? part[0] + "***" : "")).join(" ");
}
