import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import { withPermission, type AdminEnv } from '../../lib/http-auth.mjs';
import { createRouter, jsonBody, jsonError, methodNotAllowed } from '../../lib/http.mjs';
import { getLogger } from '../../lib/logging.mjs';
import { WorkerDirectory } from '../../services/worker-directory.mjs';

const newWorker = z
	.object({
		email: z.email().max(254),
		name: z.string().trim().min(1).max(80),
		role: z.enum(['worker', 'admin']),
	})
	.strict();
const changeWorker = z.object({ command: z.enum(['worker', 'admin', 'remove']) }).strict();

export const workerRoutes = createRouter<AdminEnv>();
workerRoutes.use('/workers', withPermission('manage:workers'));
workerRoutes.use('/workers/*', withPermission('manage:workers'));
// Auth0 outages fail closed, with a safe JSON error the admin can act on.
workerRoutes.onError((error) => {
	if (error instanceof HTTPException) {
		return jsonError(error.message, error.status);
	}
	getLogger().error({ message: 'worker.request_failed', err: error });

	return jsonError('Worker management is unavailable. Refresh before trying again.', 503);
});
workerRoutes.get('/workers', async (context) => {
	const directory = new WorkerDirectory();
	const actor = await directory.authorize(context.get('actor'));
	const page = Number(context.req.query('page') ?? 0);

	if (!Number.isSafeInteger(page) || page < 0 || page > 99) {
		return jsonError('Invalid page.');
	}

	return context.json(await directory.list(actor, page));
});
workerRoutes.post('/workers', async (context) => {
	const directory = new WorkerDirectory();
	const actor = await directory.authorize(context.get('actor'));
	const parsed = newWorker.safeParse(await jsonBody(context.req.raw));

	if (!parsed.success) {
		return jsonError('Enter a name, valid email, and staff role.');
	}
	await directory.add(parsed.data.email, parsed.data.name, parsed.data.role);
	getLogger().info({ message: 'worker.created', actor, role: parsed.data.role });

	return context.json({ ok: true }, 201);
});
workerRoutes.patch('/workers/:id', async (context) => {
	const directory = new WorkerDirectory();
	const actor = await directory.authorize(context.get('actor'));
	const parsed = changeWorker.safeParse(await jsonBody(context.req.raw));

	if (!parsed.success) {
		return jsonError('Choose a staff role or remove access.');
	}
	const target = context.req.param('id');

	await directory.change(actor, target, parsed.data.command);
	getLogger().info({
		message: 'worker.access_changed',
		actor,
		target,
		command: parsed.data.command,
	});

	return context.json({ ok: true });
});
workerRoutes.all('/workers', methodNotAllowed);
workerRoutes.all('/workers/:id', methodNotAllowed);
