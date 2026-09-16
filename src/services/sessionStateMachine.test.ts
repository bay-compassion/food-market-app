import { describe, expect, it } from 'vitest';

import {
	canRunSessionCommand,
	currentSessionState,
	sessionCommandTarget,
} from './sessionStateMachine';

describe('sessionStateMachine', () => {
	it.each([
		['scheduled', 'open_registration', 'registration_open'],
		['registration_open', 'close_registration', 'registration_closed'],
		['registration_closed', 'reopen_registration', 'registration_open'],
		['lottery_pending', 'run_lottery', 'service_started'],
		['service_started', 'close_session', 'ended'],
	] as const)('allows %s → %s → %s', (status, command, target) => {
		expect(canRunSessionCommand(status, command)).toBe(true);
		expect(sessionCommandTarget(command)).toBe(target);
	});

	it('rejects commands from the wrong state', () => {
		expect(canRunSessionCommand('scheduled', 'run_lottery')).toBe(false);
		expect(canRunSessionCommand('registration_open', 'open_registration')).toBe(false);
		expect(canRunSessionCommand('ended', 'reset_session')).toBe(false);
	});

	it('does not reset a session that never opened', () => {
		expect(canRunSessionCommand('scheduled', 'reset_session')).toBe(false);
	});

	it('postpones the lottery only while it is pending, without changing status', () => {
		expect(canRunSessionCommand('lottery_pending', 'postpone_lottery')).toBe(true);
		expect(canRunSessionCommand('service_started', 'postpone_lottery')).toBe(false);
		expect(sessionCommandTarget('postpone_lottery')).toBeNull();
	});

	it('maps ended sessions to the inactive interface', () => {
		expect(currentSessionState()).toBe('inactive');
		expect(currentSessionState('ended')).toBe('inactive');
		expect(currentSessionState('service_started')).toBe('service_started');
		expect(currentSessionState('lottery_pending')).toBe('lottery_pending');
	});
});
