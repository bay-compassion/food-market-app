import { describe, expect, it } from 'vitest';

import {
	admissionCreatesVisit,
	admissionOffersPhoneClaim,
	manualAdmissionsFor,
} from './guestAdmission';

describe('manualAdmissionsFor', () => {
	it('offers saving details only, and nothing else, when there is no session', () => {
		// Act
		const admissions = manualAdmissionsFor(null);

		// Assert
		expect(admissions).toEqual(['profile']);
	});

	it('offers saving details only last, after the session’s own admissions', () => {
		// Act
		const admissions = manualAdmissionsFor('registration_open');

		// Assert
		expect(admissions).toEqual(['lottery', 'queue', 'profile']);
	});
});

describe('saving details only', () => {
	it('creates no visit, but still offers the guest’s phone a QR code', () => {
		// Act
		const createsVisit = admissionCreatesVisit('profile');
		const offersClaim = admissionOffersPhoneClaim('profile');

		// Assert
		expect(createsVisit).toBe(false);
		expect(offersClaim).toBe(true);
	});
});
