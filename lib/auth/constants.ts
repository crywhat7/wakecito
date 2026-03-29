/** Cookie httpOnly con el JWT de sesión (no exponer al cliente JS). */
export const SESSION_COOKIE_NAME = "wakecito_session";

/** Duración del token (debe coincidir con maxAge de la cookie). */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 días
