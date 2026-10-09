import { CampaignAttribution } from './models/campaign-attribution.ts';

/**
 * Reads the campaign a guest arrived from off the address bar, then takes the UTM parameters back
 * out of it with `history.replaceState`.
 *
 * Removing them is what makes a tagged page load mean an arrival: a guest who reloads during the
 * market, or bookmarks the page, would otherwise be counted as a fresh visit from the same printed
 * card. It has to happen before the router is created, since the router reads `location` once and
 * would never hear about a later `replaceState` — which is why `sentry.ts` calls this from its
 * module body rather than anything calling it from a component.
 */
export function takeArrivalAttribution(): CampaignAttribution | null {
	const url = new URL(window.location.href);
	const attribution = CampaignAttribution.fromSearchParams(url.searchParams);
	const remaining = CampaignAttribution.withoutUtmParameters(url.searchParams);

	if (remaining.size !== url.searchParams.size) {
		url.search = remaining.toString();
		window.history.replaceState(window.history.state, '', url);
	}

	return attribution;
}
