import { describe, expect, it } from 'vitest';

import {
	canRunSessionCommand,
	currentSessionState,
	sessionCommandTarget,
} from './sessionStateMachine';

describe('sessionStateMachine', () => {
	it.each([
		['draft', 'schedule_registration', 'scheduled'],
		['scheduled', 'open_registration', 'registration_open'],
		['registration_open', 'close_registration', 'registration_closed'],
		['registration_closed', 'reopen_registration', 'registration_open'],
		['lottery_pending', 'run_lottery', 'service_started'],
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

	it('maps drafts and ended sessions to the inactive interface', () => {
		expect(currentSessionState()).toBe('inactive');
		expect(currentSessionState('draft')).toBe('inactive');
		expect(currentSessionState('ended')).toBe('inactive');
		expect(currentSessionState('service_started')).toBe('service_started');
		expect(currentSessionState('lottery_pending')).toBe('lottery_pending');
	});
});
