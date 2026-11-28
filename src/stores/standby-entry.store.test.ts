import { describe, expect, it, vi } from 'vitest';

import type { StandbyTicketResult } from '../services/standby.ts';
import type { VisitStatus } from '../services/visitStateMachine.ts';
import { heldStandbyTicketKey, StandbyEntryStore } from './standby-entry.store.ts';

const ticket = {
	code: 'event-1.signature',
	ticket: 'a-standby-ticket-that-is-long-enough-1234567890',
	standbyNumber: 7,
	marketEventId: 'event-1',
};

function entryStore(options: {
	pullTicket?: (code: string) => Promise<StandbyTicketResult>;
	saved?: Map<string, string>;
	registered?: boolean;
	/** The visit this phone already holds for the session, by status. */
	visitStatus?: VisitStatus;
}) {
	const saved = options.saved ?? new Map<string, string>();
	const registration = {
		submit: vi.fn().mockResolvedValue(
			options.registered === false
				? { kind: 'error' }
				: {
						kind: 'registered',
						registration: { id: 'visit-1', status: 'waiting', visitToken: 't' },
					},
		),
	};
	const visit = {
		submit: vi.fn(),
		refresh: vi.fn().mockResolvedValue(undefined),
		belongsTo: (marketEventId: string | null | undefined) =>
			options.visitStatus !== undefined && marketEventId === 'event-1',
		status: options.visitStatus ?? null,
	};
	const pullTicket = vi.fn(
		options.pullTicket ?? (() => Promise.resolve({ kind: 'ticket' as const, ticket })),
	);
	const store = new StandbyEntryStore({
		registration: registration as never,
		visit,
		guest: { markAsReturningVisitor: vi.fn() },
		pullTicket,
		storage: {
			getItem: (key) => saved.get(key) ?? null,
			setItem: (key, value) => void saved.set(key, value),
			removeItem: (key) => void saved.delete(key),
		},
	});

	return { store, saved, registration, visit, pullTicket };
}

describe('StandbyEntryStore', () => {
	it('pulls a ticket for the scanned code and keeps it on the phone', async () => {
		// Arrange
		const { store, saved } = entryStore({});

		// Act
		await store.start(ticket.code);

		// Assert
		expect(store.state).toBe('held');
		expect(store.ticket?.standbyNumber).toBe(7);
		expect(JSON.parse(saved.get(heldStandbyTicketKey)!)).toEqual(ticket);
	});

	it('holds on to the ticket it has rather than asking for another, which would lose its place', async () => {
		// Arrange
		const saved = new Map([[heldStandbyTicketKey, JSON.stringify(ticket)]]);
		const { store, pullTicket } = entryStore({ saved });

		// Act
		await store.start(ticket.code);

		// Assert
		expect(pullTicket).not.toHaveBeenCalled();
		expect(store.ticket).toEqual(ticket);
	});

	it('pulls a new ticket for another session’s code', async () => {
		// Arrange
		const saved = new Map([
			[heldStandbyTicketKey, JSON.stringify({ ...ticket, code: 'old.code' })],
		]);
		const { store, pullTicket } = entryStore({ saved });

		// Act
		await store.start(ticket.code);

		// Assert
		expect(pullTicket).toHaveBeenCalledWith(ticket.code);
	});

	it('says why it couldn’t hold a place', async () => {
		// Arrange
		const { store } = entryStore({ pullTicket: () => Promise.resolve({ kind: 'not_open' }) });

		// Act
		await store.start(ticket.code);

		// Assert
		expect(store.state).toBe('not_open');
	});

	it('treats an address with no code as an invalid one', async () => {
		// Arrange
		const { store, pullTicket } = entryStore({});

		// Act
		await store.start(null);

		// Assert
		expect(store.state).toBe('invalid');
		expect(pullTicket).not.toHaveBeenCalled();
	});

	it('spends the ticket with the guest’s details, then lets it go', async () => {
		// Arrange
		const { store, saved, registration, visit } = entryStore({});

		await store.start(ticket.code);

		// Act
		await store.submit('en');

		// Assert
		expect(registration.submit).toHaveBeenCalledWith('queue', 'event-1', 'en', {
			standbyTicket: ticket.ticket,
		});
		expect(visit.submit).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'visit-1' }),
			'event-1',
		);
		expect(saved.has(heldStandbyTicketKey)).toBe(false);
		expect(store.state).toBe('joined');
	});

	it('keeps the ticket and the form when the details are refused', async () => {
		// Arrange
		const { store, saved } = entryStore({ registered: false });

		await store.start(ticket.code);

		// Act
		await store.submit('en');

		// Assert
		expect(store.state).toBe('held');
		expect(saved.has(heldStandbyTicketKey)).toBe(true);
	});

	it.each(['waiting', 'called', 'served'] as const)(
		'sends a guest whose visit is already %s home to their card, without pulling a ticket',
		async (visitStatus) => {
			// Arrange
			const { store, pullTicket } = entryStore({ visitStatus });

			// Act
			await store.start(ticket.code);

			// Assert
			expect(store.state).toBe('has_visit');
			expect(pullTicket).not.toHaveBeenCalled();
		},
	);

	it('lets a guest the draw passed over pull a ticket', async () => {
		// Arrange
		const { store, pullTicket } = entryStore({ visitStatus: 'not_placed' });

		// Act
		await store.start(ticket.code);

		// Assert
		expect(pullTicket).toHaveBeenCalledOnce();
		expect(store.state).toBe('held');
	});

	it('pulls once when started twice at the same time', async () => {
		// Arrange
		const { store, pullTicket } = entryStore({});

		// Act
		await Promise.all([store.start(ticket.code), store.start(ticket.code)]);

		// Assert
		expect(pullTicket).toHaveBeenCalledOnce();
		expect(store.state).toBe('held');
	});
});
