import { and, eq, ne, sql } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { guests, marketEvents, registrationQuestions, visits } from '../../db/schema.mjs';
import { buildScenario } from '../../scripts/fake-data.mjs';
import type { DemoRoster } from '../../src/services/demo-preview.js';
import type { ServiceProgress } from '../../src/services/demoScenario.js';
import type { SessionStatus } from '../../src/services/sessionStateMachine.js';
import { issueDeviceToken, issueVisitToken, normalizePhone } from './guestCredentials.mjs';
import { currentLocation } from './marketLocation.mjs';
import type { MarketEventRow } from './marketSession.mjs';
import { endSession } from './sessionEnding.mjs';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type DemoScenarioInput = {
	stage: SessionStatus;
	serviceProgress?: ServiceProgress;
};

/**
 * Guest/capacity sizing per stage, so the numbers make sense for what the stage is demoing:
 * nobody yet for `scheduled`, under capacity while registration is still open, and
 * oversubscribed once the lottery is relevant, so it actually has both winners and losers.
 */
const scenarioSizeByStage: Record<SessionStatus, { guests: number; capacity: number }> = {
	scheduled: { guests: 0, capacity: 30 },
	registration_open: { guests: 22, capacity: 30 },
	registration_closed: { guests: 34, capacity: 30 },
	lottery_pending: { guests: 34, capacity: 30 },
	service_started: { guests: 40, capacity: 30 },
	ended: { guests: 40, capacity: 30 },
};

/**
 * Off unless a deploy deliberately opts in. `loadScenario` can replace whatever session is
 * currently live, so this stays off by default rather than relying on the `manage:demo-data`
 * permission alone — see `docs/roles.md`.
 */
export function demoDataToolsEnabled() {
	return process.env.ENABLE_DEMO_DATA_TOOLS?.trim().toLowerCase() === 'true';
}

/**
 * Moves a live session out of the way of a demo. A pending session nobody has joined is deleted —
 * ending it would leave an empty session in history — and anything else is ended the way a reset
 * ends it: guests still in line cancelled, and no next session created, since the demo takes its
 * place.
 */
async function archiveSession(tx: Transaction, event: MarketEventRow) {
	if (event.status === 'scheduled') {
		const [deleted] = await tx
			.delete(marketEvents)
			.where(
				and(
					eq(marketEvents.id, event.id),
					eq(marketEvents.status, 'scheduled'),
					sql`NOT EXISTS (SELECT 1 FROM ${visits} WHERE ${visits.marketEventId} = ${marketEvents.id})`,
				),
			)
			.returning({ id: marketEvents.id });

		if (deleted) {
			return;
		}
	}

	await endSession(tx, event, 'reset');
}

/**
 * Replaces the current session with one staged at `input.stage`, for demos and screenshots.
 * Whatever session is currently live is archived first (see `archiveSession`), so this never
 * deletes history, just moves on from it.
 */
export async function loadScenario(input: DemoScenarioInput): Promise<DemoRoster> {
	const size = scenarioSizeByStage[input.stage];
	const data = buildScenario({
		stage: input.stage,
		serviceProgress: input.serviceProgress,
		guests: size.guests,
		capacity: size.capacity,
		seed: Math.floor(Math.random() * 2 ** 31),
		now: new Date(),
	});

	const deviceCredentials = new Map(data.guests.map((guest) => [guest.id, issueDeviceToken()]));
	const visitCredentials = new Map(data.visits.map((visit) => [visit.id, issueVisitToken()]));

	await db.transaction(async (tx) => {
		const stale = await tx.select().from(marketEvents).where(ne(marketEvents.status, 'ended'));

		for (const event of stale) {
			await archiveSession(tx, event);
		}

		if (data.guests.length) {
			await tx.insert(guests).values(
				data.guests.map((guest) => ({
					...guest,
					normalizedPhone: normalizePhone(guest.phone),
					deviceTokenHash: deviceCredentials.get(guest.id)!.tokenHash,
				})),
			);
		}

		const location = await currentLocation(tx);

		await tx
			.insert(marketEvents)
			.values(data.sessions.map((session) => ({ ...session, locationId: location.id })));

		if (data.questions.length) {
			await tx.insert(registrationQuestions).values(data.questions);
		}

		if (data.visits.length) {
			await tx.insert(visits).values(
				data.visits.map((visit) => ({
					...visit,
					accessTokenHash: visitCredentials.get(visit.id)!.tokenHash,
				})),
			);
		}
	});

	return {
		marketEventId: data.sessions[0]!.id,
		guests: data.guests.map((guest) => {
			const visit = data.visits.find((entry) => entry.guestId === guest.id);

			return {
				id: guest.id,
				firstName: guest.firstName,
				lastName: guest.lastName,
				phone: guest.phone,
				locale: guest.locale,
				deviceToken: deviceCredentials.get(guest.id)!.token,
				household: visit
					? {
							ageRange: visit.ageRange ?? '',
							householdSize: visit.householdSize,
							childrenCount: 0,
							seniorsCount: 0,
						}
					: null,
				visit: visit
					? {
							id: visit.id,
							token: visitCredentials.get(visit.id)!.token,
							status: visit.status,
							queuePosition: visit.queuePosition,
						}
					: null,
			};
		}),
	};
}
