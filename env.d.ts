/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_AUTH0_AUDIENCE?: string;
	readonly VITE_AUTH0_CLIENT_ID?: string;
	readonly VITE_AUTH0_DOMAIN?: string;
	readonly VITE_AUTH0_ISSUER?: string;
	readonly VITE_SENTRY_DSN?: string;
	readonly VITE_SENTRY_ENVIRONMENT?: string;
	readonly VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE?: string;
	readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
