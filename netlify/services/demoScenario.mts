import { ne } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { guests, marketEvents, registrationQuestions, visits } from '../../db/schema.mjs';
import { buildScenario } from '../../scripts/fake-data.mjs';
import type { ServiceProgress } from '../../src/services/demoScenario.js';
import type { SessionStatus } from '../../src/services/sessionStateMachine.js';
import { hashPin, issueVisitToken, normalizePhone } from './guestCredentials.mjs';
import type { ActionResult } from './marketSession.mjs';
import { resolveOutstandingVisits } from './visitQueue.mjs';

export type DemoScenarioInput = {
	stage: SessionStatus;
	serviceProgress?: ServiceProgress;
};

/** Every seeded demo guest signs in with this PIN, matching `scripts/seed-fake-data.mts`. */
const seedPin = '1234';

/**
 * Guest/capacity sizing per stage, so the numbers make sense for what the stage is demoing:
 * nobody yet for `draft`/`scheduled`, under capacity while registration is still open, and
 * oversubscribed once the lottery is relevant, so it actually has both winners and losers.
 */
const scenarioSizeByStage: Record<SessionStatus, { guests: number; capacity: number }> = {
	draft: { guests: 0, capacity: 30 },
	scheduled: { guests: 0, capacity: 30 },
	registration_open: { guests: 22, capacity: 30 },
	registration_closed: { guests: 34, capacity: 30 },
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
 * Replaces the current session with one staged at `input.stage`, for demos and screenshots.
 * Whatever session is currently live is archived first, the same way a real `close_session`
 * would — outstanding visits resolved to `no_show`, status set to `ended` — so this never deletes
 * history, just moves on from it.
 */
export async function loadScenario(input: DemoScenarioInput): Promise<ActionResult> {
	const size = scenarioSizeByStage[input.stage];
	const data = buildScenario({
		stage: input.stage,
		serviceProgress: input.serviceProgress,
		guests: size.guests,
		capacity: size.capacity,
		seed: Math.floor(Math.random() * 2 ** 31),
		now: new Date(),
	});
	const pinHash = await hashPin(seedPin);

	await db.transaction(async (tx) => {
		const stale = await tx
			.select({ id: marketEvents.id })
			.from(marketEvents)
			.where(ne(marketEvents.status, 'ended'));
		for (const event of stale) {
			await resolveOutstandingVisits(tx, event.id);
		}
		if (stale.length) {
			await tx
				.update(marketEvents)
				.set({ status: 'ended' })
				.where(ne(marketEvents.status, 'ended'));
		}

		if (data.guests.length) {
			await tx.insert(guests).values(
				data.guests.map((guest) => ({
					...guest,
					normalizedPhone: normalizePhone(guest.phone),
					pinHash,
				})),
			);
		}
		await tx.insert(marketEvents).values(data.sessions);
		if (data.questions.length) {
			await tx.insert(registrationQuestions).values(data.questions);
		}
		if (data.visits.length) {
			await tx.insert(visits).values(
				data.visits.map((visit) => ({
					...visit,
					accessTokenHash: issueVisitToken().tokenHash,
				})),
			);
		}
	});

	return { ok: true };
}
