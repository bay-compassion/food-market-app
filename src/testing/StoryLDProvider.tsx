import { LDReactContext, type LDReactClient } from '@launchdarkly/react-sdk';
import type { ReactNode } from 'react';

/**
 * A stand-in for the client `main.tsx` constructs from a real LaunchDarkly project, so a story or
 * test can render a component that calls `useBoolVariation` without reaching LaunchDarkly at all —
 * the same reason `RootStore` is seeded rather than pointed at a real backend.
 *
 * `main.tsx` spells out why this exists: "any future component that reads a flag ... needs a
 * provider in its tree, exactly as `useRootStore()` needs a `RootStoreProvider` ... a story or test
 * that exercises it nests its own `LDProvider`." This is that provider, minus the SDK: it only
 * implements what `useBoolVariation` actually calls (`isReady`, `boolVariation`, `on`/`off`), which
 * is the one variation hook any component in this app currently uses. Add to it if a story ever
 * needs to render a component that reads a flag a different way (`useStringVariation`, `useFlags`).
 *
 * Lives in `src/` rather than `.storybook/` so a story file — type-checked as part of the app
 * project, which does not reference the Storybook one — can import it directly, the same as the
 * global decorator in `.storybook/preview.tsx` does.
 */
function createStubClient(flags: Record<string, boolean>): LDReactClient {
	return {
		isReady: () => true,
		boolVariation: (key: string, defaultValue: boolean) => flags[key] ?? defaultValue,
		on: () => {},
		off: () => {},
	} as unknown as LDReactClient;
}

/**
 * Wraps a story or test's tree in the stub above. `flags` defaults to empty, which reads as "every
 * flag falls through to its hook's own default" — matching a LaunchDarkly project where the flag
 * exists but this context matches no targeting rule. A story that wants to see a flag in its other
 * state passes it explicitly, e.g. `flags={{ 'line-position-indicator-enabled': false }}`.
 */
export function StoryLDProvider({
	flags = {},
	children,
}: {
	flags?: Record<string, boolean>;
	children: ReactNode;
}) {
	return (
		<LDReactContext.Provider
			value={{ client: createStubClient(flags), initializedState: 'complete' }}
		>
			{children}
		</LDReactContext.Provider>
	);
}
