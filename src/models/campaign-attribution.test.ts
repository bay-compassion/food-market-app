import { describe, expect, it } from 'vitest';

import { CampaignAttribution } from './campaign-attribution';

const printedCard = 'utm_source=printed_card&utm_medium=offline&utm_campaign=food_market';

describe('CampaignAttribution', () => {
	it('reads the parameters the redirector adds for a printed card', () => {
		// Arrange
		const params = new URLSearchParams(printedCard);

		// Act
		const attribution = CampaignAttribution.fromSearchParams(params);

		// Assert
		expect(attribution?.tags).toEqual({
			utm_source: 'printed_card',
			utm_medium: 'offline',
			utm_campaign: 'food_market',
		});
	});

	it('records whichever parameters are present', () => {
		// Arrange
		const params = new URLSearchParams('utm_source=printed_flyer');

		// Act
		const attribution = CampaignAttribution.fromSearchParams(params);

		// Assert
		expect(attribution?.tags).toEqual({ utm_source: 'printed_flyer' });
	});

	it('is null for a URL with no UTM parameters', () => {
		// Arrange
		const params = new URLSearchParams('lang=es');

		// Act
		const attribution = CampaignAttribution.fromSearchParams(params);

		// Assert
		expect(attribution).toBeNull();
	});

	it('ignores parameters outside the UTM set', () => {
		// Arrange
		const params = new URLSearchParams('utm_source=printed_card&utm_id=42&ref=friend');

		// Act
		const attribution = CampaignAttribution.fromSearchParams(params);

		// Assert
		expect(attribution?.tags).toEqual({ utm_source: 'printed_card' });
	});

	it('normalizes case and surrounding whitespace', () => {
		// Arrange
		const params = new URLSearchParams('utm_source=%20Printed_Card%20');

		// Act
		const attribution = CampaignAttribution.fromSearchParams(params);

		// Assert
		expect(attribution?.tags).toEqual({ utm_source: 'printed_card' });
	});

	it('rejects values that could carry something other than a campaign tag', () => {
		// Arrange
		const values = ['(555) 123-4567', 'maria@example.com', 'x'.repeat(65), ''];
		const params = values.map((value) => new URLSearchParams({ utm_source: value }));

		// Act
		const attributions = params.map((p) => CampaignAttribution.fromSearchParams(p));

		// Assert
		expect(attributions).toEqual([null, null, null, null]);
	});

	it('strips every UTM parameter from a query and keeps the rest', () => {
		// Arrange
		const params = new URLSearchParams(`lang=es&${printedCard}&utm_source=extra`);

		// Act
		const remaining = CampaignAttribution.withoutUtmParameters(params);

		// Assert
		expect(remaining.toString()).toBe('lang=es');
	});
});
