import { useCallback, useEffect, useRef, useState } from "react";

const GSI_SRC = "https://accounts.google.com/gsi/client";
const SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

function loadGSI(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (window.google?.accounts?.oauth2) return resolve();

        let script = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
        const isNewScript = !script;

        if (!script) {
            script = document.createElement("script");
            script.src = GSI_SRC;
            script.async = true;
        }

        script.addEventListener("load", () => resolve(), { once: true });
        script.addEventListener("error", () => reject(new Error("Could not load Google sign-in")), { once: true });

        if(isNewScript) document.head.appendChild(script);
    });
}

export function useGoogleToken() {
    const clientRef = useRef<google.accounts.oauth2.TokenClient | null>(null);

    const [token, setToken] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        loadGSI()
            .then(() => {
                if(cancelled) return;

                clientRef.current = google.accounts.oauth2.initTokenClient({
                    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                    scope: SCOPE,
                    callback: response => {
                        if(response.error) return setError(response.error);
                        setError(null);
                        setToken(response.access_token);
                        setExpiresAt(Date.now() + Number(response.expires_in) * 1000);
                    },
                    error_callback: err => setError(err.type)
                });
            }).catch(err => setError(String(err)));
            
        return () => { cancelled = true; };
    }, []);

    // Must be called from a click handler (user gesture)
    const signIn = useCallback(() => clientRef.current?.requestAccessToken(), []);
    const signOut = useCallback(() => {
        if (token) google.accounts.oauth2.revoke(token, () => setToken(null));
    }, [token]);

    return { token, expiresAt, error, signIn, signOut };
}