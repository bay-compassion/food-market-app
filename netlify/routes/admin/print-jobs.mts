import { z } from 'zod';

import type { PrintJobSubmission } from '../../../src/services/print-jobs.js';
import { type AdminEnv, withPermission } from '../../lib/http-auth.mjs';
import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { nameTagFor, printQueue } from '../../services/print-queue.mjs';

const submissionSchema = z.object({ visitId: z.uuid() });
const jobIdSchema = z.string().regex(/^\d{15}-[0-9a-f-]{36}$/);

export const printJobRoutes = createRouter<AdminEnv>();

/**
 * A volunteer sends the open ticket's name tag to the print station. The tag is built from the
 * visit on the server, never from what the phone sends. With no station online the tag is not
 * queued at all — it would print minutes later for a guest long gone — and the phone says so.
 */
printJobRoutes.post('/print-jobs', withPermission('run:queue'), async (context) => {
	const submission = submissionSchema.safeParse(await jsonBody(context.req.raw));

	if (!submission.success) {
		return jsonError('Please name the visit to print a name tag for.');
	}

	const queue = printQueue();

	if (!(await queue.isStationOnline())) {
		return Response.json({
			queued: false,
			reason: 'station_offline',
		} satisfies PrintJobSubmission);
	}

	const tag = await nameTagFor(submission.data.visitId);

	if (!tag) {
		return jsonError('Visit not found.', 404);
	}

	await queue.enqueue(tag);

	return Response.json({ queued: true } satisfies PrintJobSubmission, { status: 202 });
});

/** The print station collects the tags waiting for it, which also marks it as online. */
printJobRoutes.get('/print-jobs', withPermission('print:name-tags'), async () => {
	const queue = printQueue();

	await queue.heartbeat();

	return Response.json({ jobs: await queue.pending() });
});
printJobRoutes.all('/print-jobs', methodNotAllowed);

/** The print station removes a tag once it has printed it. */
printJobRoutes.delete('/print-jobs/:id', withPermission('print:name-tags'), async (context) => {
	const id = jobIdSchema.safeParse(context.req.param('id'));

	if (!id.success) {
		return jsonError('Please name a print job.');
	}

	await printQueue().complete(id.data);

	return new Response(null, { status: 204 });
});
printJobRoutes.all('/print-jobs/:id', methodNotAllowed);

/** Whether a print station is online, so a phone can choose between it and its own dialog. */
printJobRoutes.get('/print-station', withPermission('run:queue'), async () =>
	Response.json({ online: await printQueue().isStationOnline() }),
);
printJobRoutes.all('/print-station', methodNotAllowed);

export default routeHandler(createRouter<AdminEnv>().route('/api/admin', printJobRoutes));
