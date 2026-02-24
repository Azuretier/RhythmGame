import { FirebaseApp } from "firebase/app";
import {
    initializeAppCheck,
    ReCaptchaV3Provider,
    AppCheck,
    getToken,
} from "firebase/app-check";

/**
 * Initialize Firebase App Check with ReCaptchaV3Provider.
 * Automatically enables the debug provider on localhost.
 *
 * Call this once per Firebase app, after initializeApp().
 */
export function initAppCheck(app: FirebaseApp): AppCheck | null {
    if (typeof window === "undefined") return null;

    // Enable debug token on localhost BEFORE checking for site key
    // so the token is logged even during initial setup
    if (window.location.hostname === "localhost") {
        (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY;
    if (!siteKey) {
        console.warn("[App Check] Missing NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY — skipping initialization.");
        return null;
    }

    try {
        return initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(siteKey),
            isTokenAutoRefreshEnabled: false,
        });
    } catch (error) {
        console.error("[App Check] Failed to initialize:", error);
        return null;
    }
}

/**
 * Validate that App Check can successfully retrieve a token.
 * Returns true if a valid token is obtained, false otherwise.
 * Used to gate auth calls — if App Check is broken, auth will fail too.
 */
export async function validateAppCheckToken(appCheck: AppCheck): Promise<boolean> {
    try {
        await getToken(appCheck, /* forceRefresh */ false);
        return true;
    } catch {
        console.warn(
            "[App Check] Token verification failed — anonymous auth and cloud sync will be unavailable. " +
            "This may happen if ReCAPTCHA is blocked by a browser extension or the site key is misconfigured."
        );
        return false;
    }
}
