import type { Context } from 'hono';
import { z } from 'zod';

import { db } from '../../../db/index.mjs';
import { withPermission, type AdminEnv } from '../../lib/http-auth.mjs';
import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { getLogger } from '../../lib/logging.mjs';
import { tracedQuery } from '../../lib/sentry.mjs';
import { SessionDeletion } from '../../services/session-deletion.mjs';

const sessionIdSchema = z.uuid();
const sessionDeletionSchema = z.object({
	confirmation: z.string().min(1),
	/** Also removes the warehouse snapshots covering the session, which otherwise block it. */
	force: z.boolean().default(false),
});

async function previewSessionDeletion(context: Context<AdminEnv>) {
	const sessionId = sessionIdSchema.safeParse(context.req.param('sessionId'));

	if (!sessionId.success) {
		return jsonError('Invalid session.');
	}

	const preview = await tracedQuery('admin_sessions.deletion_preview', () =>
		new SessionDeletion(db, sessionId.data).preview(),
	);

	return preview ? Response.json(preview) : jsonError('Session not found.', 404);
}

async function deleteSession(context: Context<AdminEnv>) {
	const sessionId = sessionIdSchema.safeParse(context.req.param('sessionId'));
	const confirmation = sessionDeletionSchema.safeParse(await jsonBody(context.req.raw));

	if (!sessionId.success || !confirmation.success) {
		return jsonError('Type the session’s date and start time to confirm.');
	}

	const result = await tracedQuery('admin_sessions.delete', () =>
		new SessionDeletion(db, sessionId.data).delete(confirmation.data.confirmation, {
			force: confirmation.data.force,
		}),
	);

	if (!result.ok) {
		return jsonError(result.error, result.status);
	}

	// The session and its visits are gone, so this line is the only record that it happened: the
	// session's id, the worker, how many rows went, and which warehouse snapshots a forced deletion
	// removed — never a guest's details.
	getLogger().info({
		message: 'session.deleted',
		marketEventId: sessionId.data,
		actor: context.get('actor'),
		rows: result.rows,
		forced: confirmation.data.force,
		removedSnapshots: result.removedSnapshots,
	});

	return new Response(null, { status: 204 });
}

/**
 * Permanently deleting a finished session that was run as a test. Kept apart from
 * `/schedule/sessions/:id`, which deletes a pending session nobody joined under `manage:sessions`:
 * this one takes guest data with it, so it needs the data steward's `delete:guest-data`.
 */
export const sessionRoutes = createRouter<AdminEnv>();

// Gated per route, not with a `use` on the prefix: a router's middleware is merged into the admin
// API, so a prefix gate would also land on any other `/sessions` route mounted later.
sessionRoutes.delete('/sessions/:sessionId', withPermission('delete:guest-data'), (context) =>
	deleteSession(context),
);
sessionRoutes.all('/sessions/:sessionId', methodNotAllowed);
sessionRoutes.get('/sessions/:sessionId/deletion', withPermission('delete:guest-data'), (context) =>
	previewSessionDeletion(context),
);
sessionRoutes.all('/sessions/:sessionId/deletion', methodNotAllowed);

export default routeHandler(createRouter<AdminEnv>().route('/api/admin', sessionRoutes));
