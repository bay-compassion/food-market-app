/** The UTM parameters this app records. Anything else on the URL is left alone. */
export const UTM_PARAMETERS = [
	'utm_source',
	'utm_medium',
	'utm_campaign',
	'utm_content',
	'utm_term',
] as const;

export type UtmParameter = (typeof UTM_PARAMETERS)[number];

/**
 * The redirector only ever writes short snake_case tags (`printed_card`, `offline`), so anything
 * longer or stranger was typed by hand. Refusing it is what keeps a crafted link such as
 * `?utm_source=<phone number>` from carrying something that identifies a guest into Sentry.
 */
const VALID_VALUE = /^[A-Za-z0-9_.-]{1,64}$/;

/**
 * Where a guest's visit came from, as tagged by the `go.thebaycompassion.org` redirector — a
 * printed card, a flyer — read from the UTM parameters on the URL they arrived at.
 */
export class CampaignAttribution {
	private constructor(private readonly values: ReadonlyMap<UtmParameter, string>) {}

	/** The attribution in `params`, or `null` when it carries no valid UTM parameter at all. */
	static fromSearchParams(params: URLSearchParams): CampaignAttribution | null {
		const values = new Map<UtmParameter, string>();

		for (const name of UTM_PARAMETERS) {
			const value = params.get(name)?.trim();

			if (value && VALID_VALUE.test(value)) {
				values.set(name, value.toLowerCase());
			}
		}

		return values.size > 0 ? new CampaignAttribution(values) : null;
	}

	/** Every recorded parameter, keyed by its UTM name. */
	get tags(): Record<string, string> {
		return Object.fromEntries(this.values);
	}

	/** `params` with every UTM parameter removed, valid or not, and everything else kept. */
	static withoutUtmParameters(params: URLSearchParams): URLSearchParams {
		const remaining = new URLSearchParams(params);

		for (const name of UTM_PARAMETERS) {
			remaining.delete(name);
		}

		return remaining;
	}
}
