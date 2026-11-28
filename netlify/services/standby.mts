import { and, eq, sql } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { marketEvents, standbyTickets } from '../../db/schema.mjs';
import { tracedQuery } from '../lib/sentry.mjs';
import { issueVisitToken, hashVisitToken } from './guestCredentials.mjs';
import { StandbyCode } from './standby-code.mjs';
import { nextStandbyNumber } from './visitQueue.mjs';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Transaction;

/**
 * Whether a session's standby list takes guests scanning in: once shopping has actually started,
 * which is when the first number is called. Read from the visit history rather than `called_at`,
 * which `return_to_queue` clears, so standby opens once and stays open — counting only calls since
 * the session's latest draw, because a reset leaves the history of the run it undid.
 *
 * Workers can add guests to standby by hand whether or not it is open; this gates scanning in.
 */
export async function standbyIsOpen(executor: Executor, marketEventId: string): Promise<boolean> {
	// Aliased throughout: `created_at` is a column of all three tables these queries touch.
	const latestDraw = sql`
		SELECT max(d.created_at) FROM visit_events d JOIN visits dv ON dv.id = d.visit_id
		WHERE dv.market_event_id = ${marketEventId} AND d.kind IN ('drawn', 'not_drawn')`;
	const [row] = await executor
		.select({
			status: marketEvents.status,
			called: sql<boolean>`EXISTS (
				SELECT 1 FROM visit_events c JOIN visits cv ON cv.id = c.visit_id
				WHERE cv.market_event_id = ${marketEventId} AND c.kind = 'called'
					AND c.created_at > coalesce((${latestDraw}), '-infinity'::timestamptz)
			)`,
		})
		.from(marketEvents)
		.where(eq(marketEvents.id, marketEventId))
		.limit(1);

	return row?.status === 'service_started' && Boolean(row.called);
}

export type StandbyTicketResult =
	| { ok: true; ticket: string; standbyNumber: number; marketEventId: string }
	| { ok: false; status: number; error: string };

/**
 * Pulls a ticket on the standby list for a guest who scanned a session's code: the next S number,
 * held for them while they fill in their details. Refused for a code this server never signed, a
 * session that has ended, or a list that hasn't opened yet. Only the ticket's hash is kept.
 */
export async function issueStandbyTicket(code: string): Promise<StandbyTicketResult> {
	const codes = StandbyCode.fromEnvironment();

	if (!codes) {
		return { ok: false, status: 503, error: 'Standby isn’t available.' };
	}

	const marketEventId = codes.sessionOf(code);

	if (!marketEventId) {
		return { ok: false, status: 404, error: 'That standby code isn’t valid.' };
	}

	const ticket = issueVisitToken();
	const issued = await tracedQuery('standby.issue_ticket', () =>
		db.transaction(async (tx) => {
			const [event] = await tx
				.select({ status: marketEvents.status })
				.from(marketEvents)
				.where(eq(marketEvents.id, marketEventId))
				.limit(1)
				.for('update');

			if (!event || event.status === 'ended') {
				return { ok: false as const, status: 410, error: 'This standby list has closed.' };
			}

			if (!(await standbyIsOpen(tx, marketEventId))) {
				return { ok: false as const, status: 409, error: 'Standby isn’t open yet.' };
			}

			const number = await nextStandbyNumber(tx, marketEventId);
			const standbyNumber = number.toSource().standbyNumber!;

			await tx.insert(standbyTickets).values({
				marketEventId,
				tokenHash: ticket.tokenHash,
				standbyNumber,
			});

			return { ok: true as const, standbyNumber };
		}),
	);

	return issued.ok ? { ...issued, ticket: ticket.token, marketEventId } : issued;
}

/**
 * Spends a standby ticket inside the registration's transaction, returning the S number it held,
 * or `null` for a ticket that is unknown, already spent, or for another session. The single
 * `UPDATE … WHERE used_at IS NULL` means two requests racing with one ticket can't both succeed.
 */
export async function spendStandbyTicket(
	tx: Transaction,
	ticket: string,
	marketEventId: string,
): Promise<number | null> {
	const [spent] = await tx
		.update(standbyTickets)
		.set({ usedAt: new Date() })
		.where(
			and(
				eq(standbyTickets.tokenHash, hashVisitToken(ticket)),
				eq(standbyTickets.marketEventId, marketEventId),
				sql`${standbyTickets.usedAt} IS NULL`,
			),
		)
		.returning({ id: standbyTickets.id, standbyNumber: standbyTickets.standbyNumber });

	return spent?.standbyNumber ?? null;
}

/** Records which visit a spent ticket became, for the record. */
export async function recordTicketVisit(
	tx: Transaction,
	ticket: string,
	visitId: string,
): Promise<void> {
	await tx
		.update(standbyTickets)
		.set({ visitId })
		.where(eq(standbyTickets.tokenHash, hashVisitToken(ticket)));
}
