import { jsonOk } from "@/lib/api/response";
import { clearSessionCookie } from "@/lib/auth/session-cookie";

export async function POST() {
  await clearSessionCookie();
  return jsonOk({ ok: true });
}
