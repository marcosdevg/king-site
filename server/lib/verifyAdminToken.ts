/**
 * Verifica ID token Firebase com Identity Toolkit (`accounts:lookup`).
 * O endpoint `oauth2.googleapis.com/tokeninfo` falha ou omite e-mail para tokens Firebase → 401 no admin.
 */
const DEFAULT_ADMIN_EMAIL = 'kingoversized@gmail.com';

/** Mesma Web API Key do cliente Firebase (pública; pode sobrescrever com FIREBASE_WEB_API_KEY). */
const FIREBASE_WEB_API_KEY =
  process.env.FIREBASE_WEB_API_KEY ?? 'AIzaSyAV1ZkTG7nnjgNaNZURLe6He6P2JcUqwF0';

export async function getEmailFromFirebaseIdToken(
  idToken: string
): Promise<string | null> {
  const trimmed = idToken.trim();
  if (!trimmed) return null;
  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: trimmed }),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { users?: Array<{ email?: string }> };
    const email = j.users?.[0]?.email;
    return typeof email === 'string' ? email.toLowerCase().trim() : null;
  } catch {
    return null;
  }
}

export function isAdminEmail(email: string): boolean {
  const allowed = (process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).toLowerCase().trim();
  return email.toLowerCase().trim() === allowed;
}
