import { useBoolVariation } from '@launchdarkly/react-sdk';

/** The LaunchDarkly flag `useLinePositionIndicatorEnabled` reads. Must exist in the project — a
 *  flag key LaunchDarkly can't resolve evaluates to this hook's default forever, which looks
 *  identical to "on on purpose." Exported so a story or test can target it through
 *  `StaticLDProvider`'s `flags` map without hard-coding the key a second time. */
export const LINE_POSITION_INDICATOR_FLAG_KEY = 'line-position-indicator-enabled';

/**
 * Whether a guest's place in line should be shown as more than the raw queue-position number:
 * `QueuePositionDots` — the decorative row of figures ending in a cart — and, in `WaitingVisitStatus`,
 * the "N guests ahead of you" count that sits next to it. Both read as one unit describing the same
 * fact, so they come and go together rather than the count surviving on its own with no dots, or
 * the reverse.
 *
 * Unlike `enableReplayWhenFlagged`'s `sentry-replay-enabled`, whose safe default is `false` (don't
 * spend replay quota on an unresolved flag), this defaults to `true`: the indicator has already
 * shipped, so the safe fallback is the current behavior, not the absence of it. This flag exists
 * as a kill switch a project can use to hide it without a redeploy, not to gate a rollout.
 *
 * Requires an `LDReactContext` in the tree, same as any other LaunchDarkly hook — `main.tsx` always
 * mounts one (or refuses to start), and stories and tests use `StaticLDProvider`. `WaitingVisitStatus` and `CalledVisitStatus`
 * call this instead of `QueuePositionDots` importing the SDK directly, so the component that
 * decides whether the row appears also decides what replaces it (nothing, in both cases).
 */
export function useLinePositionIndicatorEnabled(): boolean {
	return useBoolVariation(LINE_POSITION_INDICATOR_FLAG_KEY, true);
}
