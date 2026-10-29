import { describe, expect, it } from 'vitest';

import type { SessionStatus } from '../services/sessionStateMachine';
import { RegistrationClock } from './registration-clock';

const opensAt = Date.parse('2026-10-31T17:30:00.000Z');
const closesAt = opensAt + 15 * 60_000;
const minute = 60_000;

function clock(status: SessionStatus) {
	return new RegistrationClock({
		status,
		registrationOpensAt: new Date(opensAt),
		registrationClosesAt: new Date(closesAt),
	});
}

describe('RegistrationClock', () => {
	it.each([
		['more than ten minutes before opening', 'scheduled', opensAt - 10 * minute - 1, 'hidden'],
		['ten minutes before opening', 'scheduled', opensAt - 10 * minute, 'opens'],
		['opening time, before the server agrees', 'scheduled', opensAt, 'opening'],
		['a device running behind the server', 'registration_open', opensAt - 2_000, 'opened'],
		['just after opening', 'registration_open', opensAt + 9_999, 'opened'],
		['ten seconds after opening', 'registration_open', opensAt + 10_000, 'closes'],
		['after the window has run out', 'registration_open', closesAt, 'hidden'],
		['once registration has closed', 'registration_closed', opensAt + minute, 'hidden'],
	] as const)('at %s (%s) shows %s', (_moment, status, now, expected) => {
		// Act
		const phase = clock(status).phaseAt(now);

		// Assert
		expect(phase.kind).toBe(expected);
	});

	it('counts down to opening', () => {
		// Act
		const phase = clock('scheduled').phaseAt(opensAt - 90_000);

		// Assert
		expect(phase).toEqual({ kind: 'opens', remainingMs: 90_000 });
	});

	it('warms only in the last five minutes before closing', () => {
		// Act
		const early = clock('registration_open').phaseAt(closesAt - 6 * minute);
		const halfway = clock('registration_open').phaseAt(closesAt - 2.5 * minute);

		// Assert
		expect(early).toMatchObject({ kind: 'closes', progress: 0 });
		expect(halfway).toMatchObject({ kind: 'closes', progress: 0.5 });
	});
});
