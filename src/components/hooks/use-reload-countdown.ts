import { useBoolVariation } from '@launchdarkly/react-sdk';

/** The LaunchDarkly flag `useReloadCountdown` reads. Exported so a story or test can target it
 *  through `StaticLDProvider`'s `flags` map without hard-coding the key a second time. */
export const RELOAD_COUNTDOWN_FLAG_KEY = 'show-reload-countdown';

/**
 * Whether a guest with a live visit sees `VisitRefreshNotice`, the countdown to the next background
 * refresh. Off by default, matching the flag's off variation in LaunchDarkly, so an unreachable
 * LaunchDarkly and a disabled flag look the same to a guest. Requires an `LDReactContext` in the
 * tree, same as any other LaunchDarkly hook.
 */
export function useReloadCountdown(): boolean {
	return useBoolVariation(RELOAD_COUNTDOWN_FLAG_KEY, false);
}
