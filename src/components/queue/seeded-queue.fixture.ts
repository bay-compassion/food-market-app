import { LineOrder } from '../../models/line-order';
import type { AdminApi, AdminGuest, GuestDetails } from '../../services/admin-api';
import type { QueuePlacement } from '../../services/guestAdmission';
import type { HouseholdServiceEntry } from '../../services/household-service';
import type { Permission } from '../../services/permissions';
import { SessionStatusEnum } from '../../services/sessionStateMachine';
import type { VisitEvent } from '../../services/visit-events';
import { visitCommandTarget, type VisitCommand } from '../../services/visitStateMachine';
import type { SessionOverview } from '../../stores/market-session.store';
import { RootStore } from '../../stores/root.store';
import { busyQueue, queueGuest } from '../admin/queueGuests.fixture';

export const seededEventId = 'story-event';

/**
 * The fixture's people, each with a place in line, the way a drawn session numbers them: those
 * still waiting stand in the line in the order of their numbers.
 */
export const numberedQueue: AdminGuest[] = [
	...busyQueue.map((guest, index) => ({
		...guest,
		queuePosition: index + 1,
		queueOrder: guest.status === 'waiting' ? index + 1 : null,
		marketEventId: seededEventId,
	})),
	// Entered the lottery and was not drawn, so has no place in line.
	{
		...queueGuest({
			id: 'guest-not-placed-1',
			firstName: 'Tomás',
			lastName: 'Rivera',
			locale: 'es',
			status: 'not_placed',
			queuePosition: null,
		}),
		marketEventId: seededEventId,
	},
];

const matt = {
	kind: 'worker',
	id: 'auth0|story-worker',
	name: 'Matt',
} as const;

/**
 * A plausible history for a guest in the story line: drawn in the lottery, then whatever brought
 * them to where they are now, each step a few minutes after the last.
 */
function historyFor(guest: AdminGuest | undefined): VisitEvent[] {
	if (!guest) {
		return [];
	}

	const start = Date.now() - 40 * 60_000;
	const at = (minutes: number) => new Date(start + minutes * 60_000).toISOString();
	const event = (
		id: string,
		kind: VisitEvent['kind'],
		toStatus: VisitEvent['toStatus'],
		actor: VisitEvent['actor'],
		minutes: number,
		details: VisitEvent['details'] = {},
	): VisitEvent => ({
		id: `${guest.id}-${id}`,
		kind,
		toStatus,
		actor,
		details,
		createdAt: at(minutes),
	});
	const registered = event('registered', 'registered', 'registered', { kind: 'guest' }, 0);

	if (guest.status === 'not_placed') {
		return [registered, event('drawn', 'not_drawn', 'not_placed', { kind: 'system' }, 10)];
	}

	const drawn = event('drawn', 'drawn', 'waiting', { kind: 'system' }, 10, {
		queuePosition: guest.queuePosition ?? undefined,
	});
	const called = event('called', 'called', 'called', matt, 25);

	switch (guest.status) {
		case 'called':
			return [registered, drawn, called];
		case 'served':
			return [registered, drawn, called, event('served', 'served', 'served', matt, 30)];
		case 'no_show':
			return [registered, drawn, called, event('no-show', 'no_show', 'no_show', matt, 35)];
		default:
			return [registered, drawn];
	}
}

export type SeededQueueOptions = {
	guests: AdminGuest[];
	/** How long each request takes to answer, for what a screen does while one is on its way. */
	latencyMs?: number;
	/** What the signed-in worker may do. A volunteer who runs the line, unless a story says more. */
	permissions?: Permission[];
	/** Where the session stands. Serving, unless a story is about before or after. */
	sessionStatus?: SessionStatusEnum;
};

/**
 * A root store whose admin API answers from `guests` and keeps up with every command, the way the
 * server would, in a session that is serving unless told otherwise. For the queue's stories and tests, which would
 * otherwise sign in and fetch the real session.
 */
export function seededQueueStore({
	guests,
	latencyMs = 0,
	permissions = ['run:queue'],
	sessionStatus = SessionStatusEnum.SERVICE_STARTED,
}: SeededQueueOptions): RootStore {
	let roster = guests.map((guest) => ({ ...guest }));
	let households: HouseholdServiceEntry[] = [];

	/** Calls the guest at the front of the line, in the server's queue order. */
	function callNext(): string[] {
		const [next] = roster.filter((guest) => guest.status === 'waiting').sort(LineOrder.compare);

		if (!next) {
			return [];
		}

		roster = roster.map((guest) =>
			guest === next
				? {
						...guest,
						status: 'called',
						calledAt: new Date().toISOString(),
					}
				: guest,
		);

		return [next.id];
	}

	/** Puts a guest back in line at the back or the front, the way the server does. */
	function returnToQueue(visitId: string, placement: QueuePlacement) {
		const positions = roster.map((guest) => guest.queuePosition ?? 0);
		const front = Math.min(
			...roster
				.filter((guest) => guest.status === 'waiting')
				.map((guest) => guest.queuePosition ?? 0),
		);
		const position = placement === 'end' ? Math.max(...positions) + 1 : front;

		roster = roster.map((guest) => {
			if (guest.id === visitId) {
				return {
					...guest,
					status: 'waiting',
					calledAt: null,
					queuePosition: position,
					queueOrder: position,
				};
			}

			return placement === 'next' && guest.status === 'waiting'
				? {
						...guest,
						queuePosition: (guest.queuePosition ?? 0) + 1,
						queueOrder: (guest.queueOrder ?? 0) + 1,
					}
				: guest;
		});
	}

	const api = {
		householdServiceEntries: async () => households,
		recordHouseholdService: async (submission: {
			id: string;
			marketEventId: string;
			householdSize: number;
		}) => {
			const existing = households.find((row) => row.id === submission.id);

			if (existing) {
				return existing;
			}
			const entry: HouseholdServiceEntry = {
				...submission,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				createdBy: matt.id,
				updatedBy: matt.id,
				version: 1,
				voidedAt: null,
			};

			households = [entry, ...households];

			return entry;
		},
		correctHouseholdService: async (
			id: string,
			correction: { version: number; householdSize: number; voided: boolean },
		) => {
			const original = households.find((row) => row.id === id)!;
			const updated = {
				...original,
				householdSize: correction.householdSize,
				version: original.version + 1,
				voidedAt: correction.voided ? new Date().toISOString() : null,
			};

			households = households.map((row) => (row.id === id ? updated : row));

			return updated;
		},
		listSessionGuests: async () => roster,
		listVisitEvents: async (visitId: string) => historyFor(roster.find(({ id }) => id === visitId)),
		runGuestCommand: async (visitId: string, command: VisitCommand, placement?: QueuePlacement) => {
			if (command === 'return_to_queue' && placement) {
				returnToQueue(visitId, placement);
			} else {
				const status = visitCommandTarget(command);

				roster = roster.map((guest) => (guest.id === visitId ? { ...guest, status } : guest));
			}
		},
		callNext: async () => callNext(),
		updateGuestDetails: async (guestId: string, details: GuestDetails) => {
			roster = roster.map((guest) =>
				guest.guestId === guestId
					? {
							...guest,
							pronunciation: details.pronunciation || null,
							staffNotes: details.staffNotes || null,
						}
					: guest,
			);
		},
		serveAndCallNext: async (visitId: string) => {
			roster = roster.map((guest) =>
				guest.id === visitId ? { ...guest, status: 'served' } : guest,
			);

			return callNext();
		},
	} as unknown as AdminApi;

	// Every answer arrives `latencyMs` late, as it would over a market's connection.
	for (const [name, request] of Object.entries(api) as [
		string,
		(...args: unknown[]) => unknown,
	][]) {
		(api as unknown as Record<string, unknown>)[name] = async (...args: unknown[]) => {
			await new Promise((resolve) => setTimeout(resolve, latencyMs));

			return request(...args);
		};
	}
	const overview: SessionOverview = {
		event: {
			id: seededEventId,
			status: sessionStatus,
			capacity: 100,
			registrationOpensAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
			registrationClosesAt: new Date(Date.now() - 3_600_000).toISOString(),
		},
		questions: [],
		counts: {},
	};
	const store = new RootStore({
		admin: { api, readPermissions: async () => permissions },
		// Every session request this screen sends is a read of the overview.
		session: { fetch: async () => Response.json(overview) },
	});

	store.session.applyServerState(overview);

	return store;
}
