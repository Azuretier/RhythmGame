import { FirebaseApp } from "firebase/app";
import {
    initializeAppCheck,
    ReCaptchaV3Provider,
    AppCheck,
} from "firebase/app-check";

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
            isTokenAutoRefreshEnabled: true,
        });
    } catch (error) {
        console.error("[App Check] Failed to initialize:", error);
        return null;
    }
}
