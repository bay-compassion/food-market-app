import { describe, expect, it } from 'vitest';

import { claimTokenFromHash, guestClaimUrl } from './guest-claim';

const token = 'claim-token-shown-as-a-qr-code-1234567890abcdef';

describe('guest claim links', () => {
	it('carries the code in the fragment, where it never reaches a server', () => {
		// Act
		const url = new URL(guestClaimUrl('https://market.example', token));

		// Assert
		expect(url.pathname).toBe('/claim');
		expect(url.search).toBe('');
		expect(claimTokenFromHash(url.hash)).toBe(token);
	});

	it.each(['', '#', '#too-short'])('finds no code in %j', (hash) => {
		// Act
		const found = claimTokenFromHash(hash);

		// Assert
		expect(found).toBeNull();
	});
});
