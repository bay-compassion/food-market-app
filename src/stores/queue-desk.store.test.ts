import { observable } from 'mobx';
import { describe, expect, it, vi } from 'vitest';

import type { AdminGuest } from '../services/admin-api';
import type { Permission } from '../services/permissions';
import { SessionStatusEnum } from '../services/sessionStateMachine';
import type { VisitEvent } from '../services/visit-events';
import type { AdminStore } from './admin.store';
import type { MarketSessionStore } from './market-session.store';
import { NotificationStore } from './notification.store';
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
	// Observable like the real `AdminStore`, so a reassigned list reaches the desk's computeds.
	const admin = observable(
		{
			sessionGuests: guests,
			isBusy: false,
			can: (permission: Permission) => permissions.includes(permission),
			loadPermissions: vi.fn().mockResolvedValue(undefined),
			refreshSessionGuests: vi.fn().mockResolvedValue(undefined),
			callNext: vi.fn().mockResolvedValue(called),
			serveAndCallNext: vi.fn().mockResolvedValue(called),
			listVisitEvents: vi.fn().mockResolvedValue([] as VisitEvent[]),
			isPrintStationOnline: vi.fn().mockResolvedValue(false),
			sendNameTag: vi.fn().mockResolvedValue({ queued: true }),
			runGuestCommand: vi.fn().mockResolvedValue(undefined),
			runMarketAction: vi.fn().mockResolvedValue(undefined),
		},
		{
			can: false,
			loadPermissions: false,
			refreshSessionGuests: false,
			callNext: false,
			serveAndCallNext: false,
			listVisitEvents: false,
			isPrintStationOnline: false,
			sendNameTag: false,
			runGuestCommand: false,
			runMarketAction: false,
		},
		{ deep: false },
	);
	const session = {
		currentStatus: status,
		currentState: status ? { event: { id: 'event-1', status } } : null,
		getStatus: vi.fn().mockResolvedValue(undefined),
	};
	const notifications = new NotificationStore();
	const desk = new QueueDeskStore(
		admin as unknown as AdminStore,
		session as unknown as MarketSessionStore,
		{ pollIntervalMs: 60_000, notifications },
	);

	return { desk, admin, session, notifications };
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

	it('returns a guest to the back of the line unless told otherwise', async () => {
		// Arrange
		const { desk, admin } = deskWith();
		const guest = guestWith({ status: 'no_show' });

		// Act
		await desk.run(guest, 'return_to_queue');
		await desk.run(guest, 'return_to_queue', 'next');
		await desk.run(guest, 'mark_no_show');

		// Assert
		expect(admin.runGuestCommand.mock.calls.map((call) => call.slice(1))).toEqual([
			['return_to_queue', 'end'],
			['return_to_queue', 'next'],
			['mark_no_show', undefined],
		]);
	});

	it('loads the history of the ticket it opens', async () => {
		// Arrange
		const { desk, admin } = deskWith();
		const called: VisitEvent = {
			id: 'event-1',
			kind: 'called',
			toStatus: 'called',
			actor: { kind: 'worker', id: 'auth0|worker', name: 'Matt' },
			details: {},
			createdAt: '2026-10-05T18:24:00.000Z',
		};

		admin.listVisitEvents.mockResolvedValueOnce([called]);

		// Act
		const before = desk.history;

		desk.select(admin.sessionGuests[0]!);

		// Assert
		expect(before).toBeNull();
		await vi.waitFor(() => expect(desk.history).toEqual([called]));
		expect(admin.listVisitEvents).toHaveBeenCalledWith('visit-1');
		desk[Symbol.dispose]();
	});

	it('drops a history that arrives after the volunteer moved to another ticket', async () => {
		// Arrange
		let resolveFirst = (_events: VisitEvent[]) => {};
		const second = guestWith({ id: 'visit-2' });
		const { desk, admin } = deskWith({ guests: [guestWith(), second] });

		admin.listVisitEvents
			.mockImplementationOnce(
				() =>
					new Promise<VisitEvent[]>((resolve) => {
						resolveFirst = resolve;
					}),
			)
			.mockImplementationOnce(() => new Promise<VisitEvent[]>(() => {}));

		// Act
		desk.select(admin.sessionGuests[0]!);
		desk.select(second);
		resolveFirst([]);
		await Promise.resolve();

		// Assert
		expect(desk.history).toBeNull();
		desk[Symbol.dispose]();
	});

	it('reads the history again when the open ticket’s status changes', async () => {
		// Arrange
		const { desk, admin } = deskWith();

		desk.select(admin.sessionGuests[0]!);
		await vi.waitFor(() => expect(desk.history).toEqual([]));

		// Act
		admin.sessionGuests = [guestWith({ status: 'called' })];

		// Assert
		expect(admin.listVisitEvents).toHaveBeenCalledTimes(2);
		desk[Symbol.dispose]();
	});

	it('shows an empty history rather than an error when the read fails', async () => {
		// Arrange
		const { desk, admin } = deskWith();

		admin.listVisitEvents.mockRejectedValue(new Error('history'));

		// Act
		desk.select(admin.sessionGuests[0]!);

		// Assert
		await vi.waitFor(() => expect(desk.history).toEqual([]));
		desk[Symbol.dispose]();
	});

	it('learns whether a print station is online with each refresh', async () => {
		// Arrange
		const { desk, admin } = deskWith();

		admin.isPrintStationOnline.mockResolvedValueOnce(true);

		// Act
		await desk.refresh();

		// Assert
		expect(desk.printStationOnline).toBe(true);
	});

	it('confirms a name tag sent to the print station', async () => {
		// Arrange
		const { desk, admin, notifications } = deskWith();
		const guest = admin.sessionGuests[0]!;

		// Act
		const sending = desk.sendNameTag(guest);
		const whileSending = desk.isSendingNameTag(guest);

		await sending;

		// Assert
		expect(whileSending).toBe(true);
		expect(desk.isSendingNameTag(guest)).toBe(false);
		expect(admin.sendNameTag).toHaveBeenCalledWith('visit-1');
		expect(notifications.pending.at(-1)).toMatchObject({ severity: 'success' });
	});

	it('marks the station offline when a tag sent to it turns out not to be queued', async () => {
		// Arrange
		const { desk, admin, notifications } = deskWith();

		admin.isPrintStationOnline.mockResolvedValueOnce(true);
		admin.sendNameTag.mockResolvedValueOnce({ queued: false, reason: 'station_offline' });
		await desk.refresh();

		// Act
		await desk.sendNameTag(admin.sessionGuests[0]!);

		// Assert
		expect(desk.printStationOnline).toBe(false);
		expect(notifications.pending.at(-1)).toMatchObject({ severity: 'error' });
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
