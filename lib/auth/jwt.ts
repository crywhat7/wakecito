import { SignJWT, jwtVerify } from "jose";

import { SESSION_MAX_AGE_SEC } from "./constants";

export type SessionClaims = {
  sub: string;
  email: string;
  name: string;
  companyId: string;
  companyName: string;
  role: string;
};

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET debe estar definida y tener al menos 32 caracteres.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(claims: SessionClaims): Promise<string> {
  const key = getSecretKey();
  return new SignJWT({
    email: claims.email,
    name: claims.name,
    companyId: claims.companyId,
    companyName: claims.companyName,
    role: claims.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(key);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionClaims | null> {
  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    const sub = payload.sub;
    if (
      typeof sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.companyId !== "string" ||
      typeof payload.companyName !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    return {
      sub,
      email: payload.email,
      name: payload.name,
      companyId: payload.companyId,
      companyName: payload.companyName,
      role: payload.role,
    };
  } catch {
    return null;
  }
}
