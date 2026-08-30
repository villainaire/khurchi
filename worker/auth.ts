// worker/auth.ts
import * as jose from "jose";

const DEFAULT_SECRET = "khurchi_jwt_secret_mumbai_2026";

export async function signAdminToken(
  email: string,
  secret: string = DEFAULT_SECRET
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret || DEFAULT_SECRET);
  return await new jose.SignJWT({ email, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifyAdminToken(
  token: string,
  secret: string = DEFAULT_SECRET
): Promise<{ email: string; role: string } | null> {
  try {
    const secretKey = new TextEncoder().encode(secret || DEFAULT_SECRET);
    const { payload } = await jose.jwtVerify(token, secretKey);
    return {
      email: String(payload.email || "admin"),
      role: String(payload.role || "admin"),
    };
  } catch {
    return null;
  }
}

/**
 * Mask customer name for public tracking: "Rajesh Verma" -> "R**** V****"
 */
export function maskName(name: string): string {
  if (!name) return "***";
  const parts = name.trim().split(/\s+/);
  return parts
    .map((p) => (p.length > 1 ? `${p[0]}${"*".repeat(p.length - 1)}` : p))
    .join(" ");
}

/**
 * Mask customer phone for public tracking: "9820123456" -> "98******56"
 */
export function maskPhone(phone: string): string {
  if (!phone) return "**********";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length <= 4) return "******";
  const prefix = cleaned.slice(0, 2);
  const suffix = cleaned.slice(-2);
  const stars = "*".repeat(Math.max(4, cleaned.length - 4));
  return `${prefix}${stars}${suffix}`;
}
