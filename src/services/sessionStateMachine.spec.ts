import { describe, expect, it } from 'vitest';

import {
	automaticSessionStatus,
	canRunSessionCommand,
	currentSessionState,
	openingWindow,
	postponedWindow,
	sessionCommandTarget,
	type SessionStatus,
} from './sessionStateMachine';

const scheduledSession = {
	status: 'scheduled' as SessionStatus,
	sessionMode: 'scheduled' as const,
	registrationOpensAt: new Date('2026-07-18T16:00:00.000Z'),
	registrationClosesAt: new Date('2026-07-18T17:00:00.000Z'),
};

describe('sessionStateMachine', () => {
	it.each([
		['draft', 'schedule_registration', 'scheduled'],
		['scheduled', 'open_registration', 'registration_open'],
		['registration_open', 'close_registration', 'registration_closed'],
		['registration_closed', 'reopen_registration', 'registration_open'],
		['registration_closed', 'run_lottery', 'service_started'],
		['service_started', 'close_session', 'ended'],
	] as const)('allows %s → %s → %s', (status, command, target) => {
		expect(canRunSessionCommand(status, command, 'scheduled')).toBe(true);
		expect(sessionCommandTarget(command)).toBe(target);
	});

	it('rejects commands from the wrong state or session mode', () => {
		expect(canRunSessionCommand('draft', 'run_lottery', 'scheduled')).toBe(false);
		expect(canRunSessionCommand('registration_open', 'open_registration', 'ad_hoc')).toBe(false);
		expect(canRunSessionCommand('draft', 'schedule_registration', 'ad_hoc')).toBe(false);
		expect(canRunSessionCommand('ended', 'reset_session', 'scheduled')).toBe(false);
	});

	it('derives automatic scheduled opening and closing states', () => {
		expect(automaticSessionStatus(scheduledSession, new Date('2026-07-18T15:59:00.000Z'))).toBe(
			'scheduled',
		);
		expect(automaticSessionStatus(scheduledSession, new Date('2026-07-18T16:30:00.000Z'))).toBe(
			'registration_open',
		);
		expect(automaticSessionStatus(scheduledSession, new Date('2026-07-18T17:01:00.000Z'))).toBe(
			'registration_closed',
		);
	});

	it('preserves duration when opening early and shifts both times when postponed', () => {
		const opened = openingWindow(scheduledSession, new Date('2026-07-18T15:00:00.000Z'));
		expect(opened.registrationOpensAt.toISOString()).toBe('2026-07-18T15:00:00.000Z');
		expect(opened.registrationClosesAt.toISOString()).toBe('2026-07-18T16:00:00.000Z');

		const postponed = postponedWindow(scheduledSession, 30);
		expect(postponed.registrationOpensAt.toISOString()).toBe('2026-07-18T16:30:00.000Z');
		expect(postponed.registrationClosesAt.toISOString()).toBe('2026-07-18T17:30:00.000Z');
	});

	it('maps drafts and ended sessions to the inactive interface', () => {
		expect(currentSessionState()).toBe('inactive');
		expect(currentSessionState('draft')).toBe('inactive');
		expect(currentSessionState('ended')).toBe('inactive');
		expect(currentSessionState('service_started')).toBe('service_started');
	});
});
