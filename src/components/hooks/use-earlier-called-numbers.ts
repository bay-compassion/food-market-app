import { useBoolVariation } from '@launchdarkly/react-sdk';

/** The LaunchDarkly flag `useEarlierCalledNumbers` reads. Exported so a story or test can target it
 *  through `StaticLDProvider`'s `flags` map without hard-coding the key a second time. */
export const EARLIER_CALLED_NUMBERS_FLAG_KEY = 'guest-earlier-called-numbers';

/**
 * Whether a guest's "now calling" row shows, outlined beside the number the market has reached, the
 * numbers called before it that are still expected at the entrance — the phone's version of the
 * room display's "Already Called" panel. A stakeholder thought they would confuse guests, so they
 * stay behind the flag; the room display keeps its panel either way. Off by default, matching the
 * flag's off variation in LaunchDarkly, so an unreachable LaunchDarkly and a disabled flag look the
 * same to a guest. Requires an `LDReactContext` in the tree, same as any other LaunchDarkly hook.
 */
export function useEarlierCalledNumbers(): boolean {
	return useBoolVariation(EARLIER_CALLED_NUMBERS_FLAG_KEY, false);
}
