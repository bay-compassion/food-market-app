import * as Sentry from '@sentry/react';

/**
 * Adds session replay to the running client, in a module of its own so it lands in its own chunk —
 * see `loadReplay` in `sentry.ts` for why that matters on the guest path.
 *
 * Everything a guest can see is masked. A replay of this app would otherwise record a name, a
 * phone number, and a household size as they are typed, and there is no sampling rate at which
 * that is acceptable.
 */
export function addReplay(): void {
	Sentry.getClient()?.addIntegration(
		Sentry.replayIntegration({
			maskAllText: false,
			maskAllInputs: true,
			mask: ['[data-sentry-mask]'],
			unmask: ['[data-sentry-unmask]'],
			blockAllMedia: true,
			// Request and response bodies stay out of the recording. URLs alone carry no guest data,
			// because the API keeps identifiers in the body and in tokens, never in the path.
			networkDetailAllowUrls: [],
		}),
	);
}
