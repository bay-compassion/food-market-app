import { useStringVariation } from '@launchdarkly/react-sdk';

/** The LaunchDarkly flag `useLinePositionIndicator` reads. Must exist in the project — a flag key
 *  LaunchDarkly can't resolve evaluates to this hook's default forever, which looks identical to
 *  "chosen on purpose." Exported so a story or test can target it through `StaticLDProvider`'s
 *  `flags` map without hard-coding the key a second time. */
export const LINE_POSITION_INDICATOR_FLAG_KEY = 'line-position-indicator';

/**
 * How a waiting guest's place in line is shown beyond the raw queue-position number:
 *
 * - `guests-ahead` — `QueuePositionDots`, the row of figures ending in a cart, with the "N guests
 *   ahead of you" count beside it. The two describe the same fact, so they come and go together.
 *   A called guest sees the dots too, with the cart emphasized.
 * - `now-calling` — `NowCallingIndicator`, a DMV-style board with the number most recently called,
 *   for the guest to compare against their own.
 * - `none` — the queue-position number alone.
 */
export type LinePositionIndicator = 'guests-ahead' | 'now-calling' | 'none';

const linePositionIndicators: ReadonlySet<string> = new Set<LinePositionIndicator>([
	'guests-ahead',
	'now-calling',
	'none',
]);

function isLinePositionIndicator(value: string): value is LinePositionIndicator {
	return linePositionIndicators.has(value);
}

/** What an unresolved flag — or a variation this build doesn't know — falls back to. Matches the
 *  flag's off variation in LaunchDarkly, so an unreachable LaunchDarkly and a disabled flag look
 *  the same to a guest. */
const defaultIndicator: LinePositionIndicator = 'none';

/**
 * Which line position indicator to show. Requires an `LDReactContext` in the tree, same as any
 * other LaunchDarkly hook — `main.tsx` always mounts one (or refuses to start), and stories and
 * tests use `StaticLDProvider`. `WaitingVisitStatus` and `CalledVisitStatus` call this instead of
 * the indicators importing the SDK directly, so the component that lays out the panel decides what
 * goes in it.
 */
export function useLinePositionIndicator(): LinePositionIndicator {
	const value = useStringVariation(LINE_POSITION_INDICATOR_FLAG_KEY, defaultIndicator);

	return isLinePositionIndicator(value) ? value : defaultIndicator;
}
