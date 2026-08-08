import { describe, expect, it } from 'vitest';

import {
	canRunVisitCommand,
	isVisitCommand,
	isVisitStatus,
	outstandingVisitStatuses,
	visitCommandsFrom,
	visitCommandTarget,
} from './visitStateMachine';

describe('visitStateMachine', () => {
	it.each([
		['registered', 'select', 'waiting'],
		['registered', 'skip', 'not_placed'],
		['registered', 'cancel', 'cancelled'],
		['waiting', 'call', 'called'],
		['waiting', 'mark_no_show', 'no_show'],
		['waiting', 'cancel', 'cancelled'],
		['called', 'serve', 'served'],
		['called', 'mark_no_show', 'no_show'],
		['called', 'return_to_queue', 'waiting'],
		['no_show', 'return_to_queue', 'waiting'],
	] as const)('allows %s → %s → %s', (status, command, target) => {
		expect(canRunVisitCommand(status, command)).toBe(true);
		expect(visitCommandTarget(command)).toBe(target);
	});

	it.each([
		['waiting', 'serve'],
		['waiting', 'select'],
		['called', 'call'],
		['served', 'serve'],
		['served', 'return_to_queue'],
		['cancelled', 'call'],
		['not_placed', 'serve'],
		['registered', 'call'],
	] as const)('rejects %s → %s', (status, command) => {
		expect(canRunVisitCommand(status, command)).toBe(false);
	});

	it.each([
		['registered', []],
		['waiting', ['call', 'mark_no_show']],
		['called', ['serve', 'mark_no_show', 'return_to_queue']],
		['no_show', ['return_to_queue']],
		['served', []],
		['not_placed', []],
		['cancelled', []],
	] as const)('offers workers %s from %s', (status, expected) => {
		expect(visitCommandsFrom(status)).toEqual(expected);
	});

	it('never offers workers the lottery or guest-owned commands', () => {
		const offered = new Set(
			(
				['registered', 'waiting', 'called', 'served', 'not_placed', 'no_show', 'cancelled'] as const
			).flatMap((status) => visitCommandsFrom(status)),
		);

		expect(offered.has('select')).toBe(false);
		expect(offered.has('skip')).toBe(false);
		expect(offered.has('cancel')).toBe(false);
	});

	it('treats only waiting and called as outstanding at session close', () => {
		expect(outstandingVisitStatuses).toEqual(['waiting', 'called']);
	});

	it('validates statuses and commands from untrusted input', () => {
		expect(isVisitStatus('waiting')).toBe(true);
		expect(isVisitStatus('lingering')).toBe(false);
		expect(isVisitStatus(undefined)).toBe(false);
		expect(isVisitCommand('call')).toBe(true);
		expect(isVisitCommand('summon')).toBe(false);
		expect(isVisitCommand({ toString: () => 'call' })).toBe(false);
	});
});
