import { describe, expect, it, vi } from 'vitest';

import type { AdminGuest } from '../services/admin-api';
import type { Permission } from '../services/permissions';
import { SessionStatusEnum } from '../services/sessionStateMachine';
import type { AdminStore } from './admin.store';
import type { MarketSessionStore } from './market-session.store';
import { QueueDeskStore } from './queue-desk.store';

function guestWith(overrides: Partial<AdminGuest> = {}): AdminGuest {
	return {
		id: 'visit-1',
		guestId: 'guest-1',
		firstName: 'Ada',
		lastName: 'Lovelace',
		phone: '5105550123',
		householdSize: 2,
		locale: 'en',
		queuePosition: 1,
		calledAt: null,
		status: 'waiting',
		marketEventId: 'event-1',
		...overrides,
	};
}

/**
 * Plain objects of mocks, cast only where the store takes them. `sessionGuests` is a field the
 * tests reassign to stand in for a poll that brought back a new list.
 */
function deskWith({
	permissions = ['run:queue'],
	status = SessionStatusEnum.SERVICE_STARTED,
	guests = [guestWith()],
	called = ['visit-1'],
}: {
	permissions?: Permission[];
	status?: SessionStatusEnum | null;
	guests?: AdminGuest[];
	called?: string[];
} = {}) {
	const admin = {
		sessionGuests: guests,
		isBusy: false,
		can: (permission: Permission) => permissions.includes(permission),
		loadPermissions: vi.fn().mockResolvedValue(undefined),
		refreshSessionGuests: vi.fn().mockResolvedValue(undefined),
		callNext: vi.fn().mockResolvedValue(called),
		serveAndCallNext: vi.fn().mockResolvedValue(called),
		runGuestCommand: vi.fn().mockResolvedValue(undefined),
		runMarketAction: vi.fn().mockResolvedValue(undefined),
	};
	const session = {
		currentStatus: status,
		currentState: status ? { event: { id: 'event-1', status } } : null,
		getStatus: vi.fn().mockResolvedValue(undefined),
	};
	const desk = new QueueDeskStore(
		admin as unknown as AdminStore,
		session as unknown as MarketSessionStore,
		{ pollIntervalMs: 60_000 },
	);

	return { desk, admin, session };
}

describe('QueueDeskStore', () => {
	it('is loading until it has read who the worker is', () => {
		// Arrange
		const { desk } = deskWith();

		// Assert
		expect(desk.phase).toBe('loading');
	});

	it('turns away a worker without run:queue, without reading any guests', async () => {
		// Arrange
		const { desk, admin } = deskWith({ permissions: ['view:kiosk'] });

		// Act
		await desk.start();

		// Assert
		expect(desk.phase).toBe('not_permitted');
		expect(admin.refreshSessionGuests).not.toHaveBeenCalled();
		desk[Symbol.dispose]();
	});

	it('reads the session before the guests, since the guest list is keyed by it', async () => {
		// Arrange
		const order: string[] = [];
		const { desk, admin, session } = deskWith();

		session.getStatus.mockImplementation(async () => void order.push('session'));
		admin.refreshSessionGuests.mockImplementation(async () => void order.push('guests'));

		// Act
		await desk.start();

		// Assert
		expect(order.slice(0, 2)).toEqual(['session', 'guests']);
		expect(desk.phase).toBe('serving');
		desk[Symbol.dispose]();
	});

	it('names each phase of the session', async () => {
		// Arrange
		const statuses = [SessionStatusEnum.LOTTERY_PENDING, SessionStatusEnum.ENDED, null];
		const desks = statuses.map((status) => deskWith({ status }).desk);

		// Act
		await Promise.all(desks.map((desk) => desk.start()));
		const phases = desks.map((desk) => desk.phase);

		// Assert
		expect(phases).toEqual(['not_started', 'ended', 'not_started']);
		desks.forEach((desk) => desk[Symbol.dispose]());
	});

	it('leaves out guests from another session', () => {
		// Arrange
		const { desk } = deskWith({
			guests: [guestWith(), guestWith({ id: 'visit-2', marketEventId: 'event-0' })],
		});

		// Act
		const ids = desk.guests.map((guest) => guest.id);

		// Assert
		expect(ids).toEqual(['visit-1']);
	});

	it('opens the ticket of the guest it just called', async () => {
		// Arrange
		const { desk, admin } = deskWith({
			guests: [guestWith(), guestWith({ id: 'visit-2', queuePosition: 2 })],
			called: ['visit-2'],
		});

		// Act
		await desk.callNext();

		// Assert
		expect(admin.callNext).toHaveBeenCalledWith(1);
		expect(desk.selected?.id).toBe('visit-2');
	});

	it('opens the next guest’s ticket in place of the one just served', async () => {
		// Arrange
		const serving = guestWith({ status: 'called' });
		const { desk, admin } = deskWith({
			guests: [serving, guestWith({ id: 'visit-2', queuePosition: 2 })],
			called: ['visit-2'],
		});

		desk.select(serving);

		// Act
		await desk.serveAndCallNext(serving);

		// Assert
		expect(admin.serveAndCallNext).toHaveBeenCalledWith(serving);
		expect(desk.selected?.id).toBe('visit-2');
	});

	it('closes the ticket after serving when nobody was left to call', async () => {
		// Arrange
		const serving = guestWith({ status: 'called' });
		const { desk } = deskWith({ guests: [serving], called: [] });

		desk.select(serving);

		// Act
		await desk.serveAndCallNext(serving);

		// Assert
		expect(desk.selected).toBeNull();
	});

	it('offers serving and calling next only for the guest called most recently', () => {
		// Arrange
		const late = guestWith({ id: 'visit-1', status: 'called', calledAt: '2026-08-08T18:00:00Z' });
		const current = guestWith({
			id: 'visit-2',
			status: 'called',
			calledAt: '2026-08-08T18:05:00Z',
		});
		const waiting = guestWith({ id: 'visit-3', status: 'waiting' });
		const { desk } = deskWith({ guests: [late, current, waiting] });

		// Act
		const offers = [late, current, waiting].map((guest) => desk.canServeAndCallNext(guest));

		// Assert
		expect(offers).toEqual([false, true, false]);
	});

	it('does not offer serving and calling next with nobody left waiting', () => {
		// Arrange
		const current = guestWith({ status: 'called', calledAt: '2026-08-08T18:05:00Z' });
		const { desk } = deskWith({ guests: [current] });

		// Act
		const offered = desk.canServeAndCallNext(current);

		// Assert
		expect(offered).toBe(false);
	});

	it('keeps no ticket open when nobody was left to call', async () => {
		// Arrange
		const { desk } = deskWith({ called: [] });

		// Act
		await desk.callNext();

		// Assert
		expect(desk.selected).toBeNull();
	});

	it('shows the open ticket as the latest poll has it', () => {
		// Arrange
		const { desk, admin } = deskWith();

		desk.select(admin.sessionGuests[0]!);

		// Act
		admin.sessionGuests = [guestWith({ status: 'called' })];

		// Assert
		expect(desk.selected?.status).toBe('called');
	});

	it('closes the ticket', () => {
		// Arrange
		const { desk, admin } = deskWith();

		desk.select(admin.sessionGuests[0]!);

		// Act
		desk.dismiss();

		// Assert
		expect(desk.selected).toBeNull();
	});

	it('shares a read already in flight', async () => {
		// Arrange
		const { desk, admin } = deskWith();

		// Act
		await Promise.all([desk.refresh(), desk.refresh()]);

		// Assert
		expect(admin.refreshSessionGuests).toHaveBeenCalledTimes(1);
	});
});
