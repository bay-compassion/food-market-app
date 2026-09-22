/**
 * LaunchDarkly configuration read from the build environment, kept apart from `main.tsx` so a
 * component that only needs to know whether this build has a project configured does not have to
 * import the SDK itself — and free of `import.meta` so `vite.config.ts` can run the same check
 * against the build's environment before a bundle exists.
 */

export type LaunchDarklyEnvironment = {
	readonly VITE_LAUNCHDARKLY_CLIENT_ID?: string;
	readonly VITE_LAUNCHDARKLY_DISABLED?: string;
};

/**
 * - `configured`: a real project; `main.tsx` builds an SDK client from `clientSideId`.
 * - `disabled`: LaunchDarkly is switched off on purpose with `VITE_LAUNCHDARKLY_DISABLED=true`, so
 *   every flag reads as its hook's own default. Only harnesses that must stay off the network set
 *   this (the queue end-to-end rig); a Netlify build refuses it.
 * - `missing`: neither is set. That is a misconfiguration, not a default — `main.tsx` refuses to
 *   start and a Netlify build refuses to finish, rather than letting the first flag-reading screen
 *   crash for a guest (FOOD-MARKET-C/D).
 */
export type LaunchDarklySettings =
	| { status: 'configured'; clientSideId: string }
	| { status: 'disabled' }
	| { status: 'missing' };

export function launchDarklySettings(env: LaunchDarklyEnvironment): LaunchDarklySettings {
	if (env.VITE_LAUNCHDARKLY_DISABLED === 'true') {
		return { status: 'disabled' };
	}

	const clientSideId = env.VITE_LAUNCHDARKLY_CLIENT_ID;

	return clientSideId ? { status: 'configured', clientSideId } : { status: 'missing' };
}

export const MISSING_LAUNCHDARKLY_MESSAGE =
	'VITE_LAUNCHDARKLY_CLIENT_ID is not set. Set it to the LaunchDarkly client-side ID (see ' +
	'.env.example), or set VITE_LAUNCHDARKLY_DISABLED=true to run with every flag at its default.';
