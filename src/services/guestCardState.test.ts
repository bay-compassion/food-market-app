import { describe, expect, it } from 'vitest';

import { currentSessionPhase, resolveGuestCardState } from './guestCardState';
import type { MarketEventTiming } from './guestVisitApi';
import type { SessionStatus } from './sessionStateMachine';

const now = new Date('2026-07-18T16:30:00.000Z');

function eventWith(status: SessionStatus): MarketEventTiming {
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
		['draft', 'not-open'],
		['scheduled', 'not-open'],
		['registration_open', 'registration-open'],
		['registration_closed', 'registration-closed'],
		['service_started', 'in-service'],
		['ended', 'ended'],
	] as const)('maps %s to %s', (status, phase) => {
		expect(currentSessionPhase(eventWith(status), beforeOpen)).toBe(phase);
	});

	it('auto-transitions a scheduled session to registration-open once its window opens', () => {
		expect(currentSessionPhase(eventWith('scheduled'), now)).toBe('registration-open');
	});
});

describe('resolveGuestCardState', () => {
	it('shows visit status over every other phase, including registration_closed', () => {
		expect(
			resolveGuestCardState({
				phase: currentSessionPhase(eventWith('registration_closed'), now),
				marketEvent: eventWith('registration_closed'),
				isPreregistration: false,
				hasActiveVisit: true,
			}),
		).toEqual({ kind: 'visit-status' });
	});

	it('shows the early-context form on /signup while an event is still draft', () => {
		expect(
			resolveGuestCardState({
				phase: currentSessionPhase(eventWith('draft'), now),
				marketEvent: eventWith('draft'),
				isPreregistration: true,
				hasActiveVisit: false,
			}),
		).toEqual({ kind: 'form', context: 'early' });
	});

	it('shows the not-open screen without a CTA on /signup when no event exists at all', () => {
		expect(
			resolveGuestCardState({
				phase: currentSessionPhase(null, now),
				marketEvent: null,
				isPreregistration: true,
				hasActiveVisit: false,
			}),
		).toEqual({ kind: 'not-open', showPreregisterCta: false });
	});

	it('offers the preregister CTA off /signup while an event is draft', () => {
		expect(
			resolveGuestCardState({
				phase: currentSessionPhase(eventWith('draft'), now),
				marketEvent: eventWith('draft'),
				isPreregistration: false,
				hasActiveVisit: false,
			}),
		).toEqual({ kind: 'not-open', showPreregisterCta: true });
	});

	it('shows no CTA when no event exists at all, off /signup', () => {
		expect(
			resolveGuestCardState({
				phase: currentSessionPhase(null, now),
				marketEvent: null,
				isPreregistration: false,
				hasActiveVisit: false,
			}),
		).toEqual({ kind: 'not-open', showPreregisterCta: false });
	});

	it('does not offer the early form once registration has closed, even on /signup', () => {
		expect(
			resolveGuestCardState({
				phase: currentSessionPhase(eventWith('registration_closed'), now),
				marketEvent: eventWith('registration_closed'),
				isPreregistration: true,
				hasActiveVisit: false,
			}),
		).toEqual({ kind: 'registration-closed' });
	});

	it.each([
		['registration_open', { kind: 'form', context: 'queue' }],
		['registration_closed', { kind: 'registration-closed' }],
		['service_started', { kind: 'in-service' }],
		['ended', { kind: 'ended' }],
	] as const)('maps %s to %o', (status, expected) => {
		expect(
			resolveGuestCardState({
				phase: currentSessionPhase(eventWith(status), now),
				marketEvent: eventWith(status),
				isPreregistration: false,
				hasActiveVisit: false,
			}),
		).toEqual(expected);
	});

	it('respects a caller-supplied optimistic phase even when marketEvent is still null', () => {
		// Mirrors `GuestView.vue` before `/api/market` has resolved: the form stays available
		// rather than showing a "not open" screen the app can't actually confirm.
		expect(
			resolveGuestCardState({
				phase: 'registration-open',
				marketEvent: null,
				isPreregistration: true,
				hasActiveVisit: false,
			}),
		).toEqual({ kind: 'form', context: 'queue' });
	});
});
