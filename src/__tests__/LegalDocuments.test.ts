import { describe, expect, it } from 'vitest';

import privacyPolicy from '../components/legal/privacy.md?raw';
import terms from '../components/legal/terms.md?raw';

describe('SMS legal disclosures', () => {
	it('keeps mobile data handling disclosures in the privacy policy', () => {
		expect(privacyPolicy).toContain('mobile phone number or messaging consent data');
		expect(privacyPolicy).toContain(
			'not share, sell, or provide your mobile phone number or messaging consent data to third parties or affiliates for marketing or promotional purposes',
		);
	});

	it('keeps operational messaging disclosures in the terms', () => {
		expect(terms).toContain('The Bay Compassion will send you text messages');
		expect(terms).toContain('Message frequency varies');
		expect(terms).toContain('Message and data rates may apply');
		expect(terms).toContain('Reply **STOP**');
		expect(terms).toContain('**HELP** for assistance');
		expect(terms).toContain('Carriers are not liable for delayed or undelivered messages');
		expect(terms).toContain('is not required to sign up for or be served');
		expect(terms).toContain('[Privacy Policy](/privacy)');
	});
});
