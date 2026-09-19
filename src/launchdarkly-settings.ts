/**
 * LaunchDarkly configuration read from the build environment, kept apart from `main.tsx` so a
 * component that only needs to know whether this build has a project configured does not have to
 * import the SDK itself.
 */

export type LaunchDarklySettings = {
	clientSideId: string;
};

/**
 * What `createLDReactProvider` needs, or `null` when the environment has no LaunchDarkly project
 * configured — the case for local development, the unit tests, Storybook, and the end-to-end
 * suite, none of which should be reaching out to LaunchDarkly.
 */
export function launchDarklySettings(env: ImportMetaEnv): LaunchDarklySettings | null {
	const clientSideId = env.VITE_LAUNCHDARKLY_CLIENT_ID;

	return clientSideId ? { clientSideId } : null;
}
