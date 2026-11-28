import { describe, expect, it } from 'vitest';

import {
	admissionCreatesVisit,
	admissionOffersPhoneClaim,
	admissionTakesStandbyNumber,
	admissionTrack,
	admissionVisitStatus,
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
		expect(admissions).toEqual(['lottery', 'queue', 'premarket', 'profile']);
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

describe('the standby admission', () => {
	it('is offered only once the draw has run', () => {
		// Act
		const beforeDraw = manualAdmissionsFor('lottery_pending');
		const afterDraw = manualAdmissionsFor('service_started');

		// Assert
		expect(beforeDraw).not.toContain('standby');
		expect(afterDraw).toEqual(['queue', 'standby', 'premarket', 'profile']);
	});

	it('puts the guest on the postmarket track, waiting, with an S number', () => {
		// Act
		const placed = [
			admissionTrack('standby'),
			admissionVisitStatus('standby'),
			admissionTakesStandbyNumber('standby'),
		];

		// Assert
		expect(placed).toEqual(['postmarket', 'waiting', true]);
	});
});
