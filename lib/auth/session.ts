import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "./constants";
import { verifySessionToken, type SessionClaims } from "./jwt";

export type PublicSession = {
  user: { id: string; email: string; name: string };
  company: { id: string; name: string };
  role: string;
};

export function claimsToPublicSession(c: SessionClaims): PublicSession {
  return {
    user: { id: c.sub, email: c.email, name: c.name },
    company: { id: c.companyId, name: c.companyName },
    role: c.role,
  };
}

/** Lee y valida la sesión desde la cookie (RSC, layouts). */
export async function getSessionFromCookies(): Promise<PublicSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const claims = await verifySessionToken(token);
  if (!claims) return null;
  return claimsToPublicSession(claims);
}
