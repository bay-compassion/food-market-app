import { useBoolVariation } from '@launchdarkly/react-sdk';

/** The LaunchDarkly flag `useGuestTourEnabled` reads. Exported so a story or test can target it
 *  through `StaticLDProvider`'s `flags` map without hard-coding the key a second time. */
export const GUEST_TOUR_FLAG_KEY = 'guest-tour';

/**
 * Whether guests are offered the guided tour of the home screen, and can replay it from the menu.
 * Off by default, matching the flag's off variation in LaunchDarkly, so an unreachable LaunchDarkly
 * and a disabled flag look the same to a guest. Requires an `LDReactContext` in the tree, same as
 * any other LaunchDarkly hook.
 *
 * While it is off nobody is marked as having seen the tour, so turning it on offers it once to
 * every guest, new and returning alike.
 */
export function useGuestTourEnabled(): boolean {
	return useBoolVariation(GUEST_TOUR_FLAG_KEY, false);
}
