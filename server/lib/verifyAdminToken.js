/**
 * Verifica ID token Firebase (emitido no browser) via tokeninfo.
 * Só para rotas internas leves (ex.: teste n8n); produção crítica deve usar Admin SDK.
 */
const DEFAULT_ADMIN_EMAIL = 'kingoversized@gmail.com';
export async function getEmailFromFirebaseIdToken(idToken) {
    const trimmed = idToken.trim();
    if (!trimmed)
        return null;
    try {
        const url = new URL('https://oauth2.googleapis.com/tokeninfo');
        url.searchParams.set('id_token', trimmed);
        const r = await fetch(url.toString());
        if (!r.ok)
            return null;
        const j = (await r.json());
        return typeof j.email === 'string' ? j.email.toLowerCase().trim() : null;
    }
    catch {
        return null;
    }
}
export function isAdminEmail(email) {
    const allowed = (process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).toLowerCase().trim();
    return email.toLowerCase().trim() === allowed;
}
