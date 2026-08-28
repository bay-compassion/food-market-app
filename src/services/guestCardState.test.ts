import { describe, expect, it } from 'vitest';

import type { MarketEventTiming } from '../stores/market-session.store';
import { currentSessionPhase, resolveGuestCardState } from './guestCardState';
import { SessionStatusEnum } from './sessionStateMachine';

const now = new Date('2026-07-18T16:30:00.000Z');

function eventWith(status: SessionStatusEnum): MarketEventTiming {
	return {
		id: 'event-1',
		status,
		sessionMode: 'scheduled',
		registrationOpensAt: new Date('2026-07-18T16:00:00.000Z'),
		registrationClosesAt: new Date('2026-07-18T17:00:00.000Z'),
	};
}

describe('currentSessionPhase', () => {
	it('treats no event as not-open', () => {
		expect(currentSessionPhase(null, now)).toBe('not-open');
	});

	// `now` is before the window opens for every row, so `scheduled` doesn't auto-transition to
	// `registration_open` (that transition is covered separately below).
	const beforeOpen = new Date('2026-07-18T15:30:00.000Z');

	it.each([
		[SessionStatusEnum.DRAFT, 'not-open'],
		[SessionStatusEnum.SCHEDULED, 'not-open'],
		[SessionStatusEnum.REGISTRATION_OPEN, 'registration-open'],
		[SessionStatusEnum.REGISTRATION_CLOSED, 'registration-closed'],
		[SessionStatusEnum.SERVICE_STARTED, 'in-service'],
		[SessionStatusEnum.ENDED, 'ended'],
	] as const)('maps %s to %s', (status, phase) => {
		expect(currentSessionPhase(eventWith(status), beforeOpen)).toBe(phase);
	});

	it('auto-transitions a scheduled session to registration-open once its window opens', () => {
		expect(currentSessionPhase(eventWith(SessionStatusEnum.SCHEDULED), now)).toBe(
			'registration-open',
		);
	});
});

describe('resolveGuestCardState', () => {
	it('shows visit status over every other phase, including registration_closed', () => {
		expect(
			resolveGuestCardState({
				phase: currentSessionPhase(eventWith(SessionStatusEnum.REGISTRATION_CLOSED), now),
				isPreregistration: false,
				isIdentified: false,
				hasActiveVisit: true,
			}),
		).toEqual({ kind: 'visit-status' });
	});

	it('shows the early-context sign-up form on /signup when not yet identified', () => {
		expect(
			resolveGuestCardState({
				phase: currentSessionPhase(eventWith(SessionStatusEnum.DRAFT), now),
				isPreregistration: true,
				isIdentified: false,
				hasActiveVisit: false,
			}),
		).toEqual({ kind: 'form', context: 'early' });
	});

	it('offers the early sign-up form on /signup even when no event exists at all', () => {
		// Signing up is decoupled from any session — there's nothing to preregister for, but
		// creating an identity ahead of time is still useful.
		expect(
			resolveGuestCardState({
				phase: currentSessionPhase(null, now),
				isPreregistration: true,
				isIdentified: false,
				hasActiveVisit: false,
			}),
		).toEqual({ kind: 'form', context: 'early' });
	});

	it('shows the not-open screen on /signup once already identified', () => {
		expect(
			resolveGuestCardState({
				phase: currentSessionPhase(eventWith(SessionStatusEnum.DRAFT), now),
				isPreregistration: true,
				isIdentified: true,
				hasActiveVisit: false,
			}),
		).toEqual({ kind: 'not-open' });
	});

	it('shows the not-open screen off /signup when not yet identified', () => {
		expect(
			resolveGuestCardState({
				phase: currentSessionPhase(eventWith(SessionStatusEnum.DRAFT), now),
				isPreregistration: false,
				isIdentified: false,
				hasActiveVisit: false,
			}),
		).toEqual({ kind: 'not-open' });
	});

	it('shows the not-open screen off /signup once already identified', () => {
		expect(
			resolveGuestCardState({
				phase: currentSessionPhase(eventWith(SessionStatusEnum.DRAFT), now),
				isPreregistration: false,
				isIdentified: true,
				hasActiveVisit: false,
			}),
		).toEqual({ kind: 'not-open' });
	});

	it.each(['registration-open', 'registration-closed', 'in-service', 'ended'] as const)(
		'shows identity-only signup on /signup without a device token during %s',
		(phase) => {
			expect(
				resolveGuestCardState({
					phase,
					isPreregistration: true,
					isIdentified: false,
					hasActiveVisit: true,
				}),
			).toEqual({ kind: 'form', context: 'early' });
		},
	);

	it.each([
		[SessionStatusEnum.REGISTRATION_OPEN, { kind: 'form', context: 'queue' }],
		[SessionStatusEnum.REGISTRATION_CLOSED, { kind: 'registration-closed' }],
		[SessionStatusEnum.SERVICE_STARTED, { kind: 'in-service' }],
		[SessionStatusEnum.ENDED, { kind: 'ended' }],
	] as const)('maps %s to %o', (status, expected) => {
		expect(
			resolveGuestCardState({
				phase: currentSessionPhase(eventWith(status), now),
				isPreregistration: false,
				isIdentified: false,
				hasActiveVisit: false,
			}),
		).toEqual(expected);
	});

	it('respects a caller-supplied optimistic phase on the main route', () => {
		// Mirrors `GuestView.vue` before `/api/market` has resolved: the form stays available
		// rather than showing a "not open" screen the app can't actually confirm.
		expect(
			resolveGuestCardState({
				phase: 'registration-open',
				isPreregistration: false,
				isIdentified: false,
				hasActiveVisit: false,
			}),
		).toEqual({ kind: 'form', context: 'queue' });
	});
});
