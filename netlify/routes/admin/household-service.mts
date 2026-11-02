import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../../../db/index.mjs';
import { householdServiceEntries, marketEvents } from '../../../db/schema.mjs';
import { withPermission, type AdminEnv } from '../../lib/http-auth.mjs';
import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { tracedQuery } from '../../lib/sentry.mjs';

const size = z.number().int().min(1).max(30);
const submissionSchema = z.object({ id: z.uuid(), marketEventId: z.uuid(), householdSize: size });
const correctionSchema = z.object({
	version: z.number().int().positive(),
	householdSize: size,
	voided: z.boolean(),
});
const allowedStatuses = ['service_started', 'ended'];

export const householdServiceRoutes = createRouter<AdminEnv>();

householdServiceRoutes.get('/household-service', withPermission('run:queue'), async (context) => {
	const eventId = z.uuid().safeParse(context.req.query('marketEventId'));

	if (!eventId.success) {
		return jsonError('Choose a market session.');
	}
	const entries = await tracedQuery('household_service.list', () =>
		db
			.select()
			.from(householdServiceEntries)
			.where(eq(householdServiceEntries.marketEventId, eventId.data))
			.orderBy(desc(householdServiceEntries.createdAt)),
	);

	return Response.json(entries);
});

householdServiceRoutes.post('/household-service', withPermission('run:queue'), async (context) => {
	const parsed = submissionSchema.safeParse(await jsonBody(context.req.raw));

	if (!parsed.success) {
		return jsonError('Enter a whole household size from 1 to 30 and choose a session.');
	}
	const { id, marketEventId, householdSize } = parsed.data;

	return tracedQuery('household_service.create', () =>
		db.transaction(async (tx) => {
			// The session lock serializes retries and prevents a simultaneous session transition.
			const [event] = await tx
				.select({ status: marketEvents.status })
				.from(marketEvents)
				.where(eq(marketEvents.id, marketEventId))
				.limit(1)
				.for('update');

			if (!event || !allowedStatuses.includes(event.status)) {
				return jsonError('Record completed shopping only after service starts.', 409);
			}
			const [existing] = await tx
				.select()
				.from(householdServiceEntries)
				.where(eq(householdServiceEntries.id, id))
				.limit(1);

			if (existing) {
				return existing.marketEventId === marketEventId &&
					existing.initialHouseholdSize === householdSize
					? Response.json(existing)
					: jsonError(
							'This entry was already saved with different details. Refresh before continuing.',
							409,
						);
			}
			const [entry] = await tx
				.insert(householdServiceEntries)
				.values({
					id,
					marketEventId,
					householdSize,
					initialHouseholdSize: householdSize,
					createdBy: context.get('actor') ?? null,
					updatedBy: context.get('actor') ?? null,
				})
				.returning();

			return Response.json(entry, { status: 201 });
		}),
	);
});

householdServiceRoutes.patch(
	'/household-service/:id',
	withPermission('run:queue'),
	async (context) => {
		const id = z.uuid().safeParse(context.req.param('id'));
		const parsed = correctionSchema.safeParse(await jsonBody(context.req.raw));

		if (!id.success || !parsed.success) {
			return jsonError('Provide a valid household correction.');
		}
		const { version, householdSize, voided } = parsed.data;
		const [entry] = await tracedQuery('household_service.correct', () =>
			db
				.update(householdServiceEntries)
				.set({
					householdSize,
					voidedAt: voided ? new Date() : null,
					updatedAt: new Date(),
					updatedBy: context.get('actor') ?? null,
					version: version + 1,
				})
				.where(
					and(
						eq(householdServiceEntries.id, id.data),
						eq(householdServiceEntries.version, version),
					),
				)
				.returning(),
		);

		return entry
			? Response.json(entry)
			: jsonError('This entry changed or no longer exists. Refresh before correcting it.', 409);
	},
);
householdServiceRoutes.all('/household-service', methodNotAllowed);
householdServiceRoutes.all('/household-service/:id', methodNotAllowed);
export default routeHandler(createRouter<AdminEnv>().route('/api/admin', householdServiceRoutes));
