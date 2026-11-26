import type { Context } from 'hono';
import { z } from 'zod';

import { withPermission, type AdminEnv } from '../../lib/http-auth.mjs';
import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import {
	GuestNoteBook,
	GuestNoteCategories,
	guestNoteCategoryChangeSchema,
	guestNoteCategoryDraftSchema,
	guestNoteDraftSchema,
	guestNoteRevisionSchema,
	type GuestNoteResult,
} from '../../services/guest-notes.mjs';

const idSchema = z.uuid();

function noteBook(context: Context<AdminEnv>) {
	return new GuestNoteBook({
		actor: { id: context.get('actor') ?? null, name: context.get('actorName') ?? null },
		// Unset only on a route mounted without `withAuth0`, as the handler tests do.
		permissions: context.get('permissions') ?? [],
	});
}

function respond(result: GuestNoteResult, status = 200) {
	if (!result.ok) {
		return jsonError(result.error, result.status);
	}

	return result.note ? Response.json(result.note, { status }) : new Response(null, { status: 204 });
}

export const guestNoteRoutes = createRouter<AdminEnv>();

// Reading and adding notes is part of running the queue. Changing one is too, but whether a given
// note may be changed is `GuestNotePolicy`'s call, made inside `GuestNoteBook`.
guestNoteRoutes.get('/guests/:guestId/notes', withPermission('run:queue'), async (context) => {
	const guestId = idSchema.safeParse(context.req.param('guestId'));

	if (!guestId.success) {
		return jsonError('Invalid guest.');
	}

	const notes = await noteBook(context).list(guestId.data);

	return notes ? Response.json(notes) : jsonError('Guest not found.', 404);
});

guestNoteRoutes.post('/guests/:guestId/notes', withPermission('run:queue'), async (context) => {
	const guestId = idSchema.safeParse(context.req.param('guestId'));
	const draft = guestNoteDraftSchema.safeParse(await jsonBody(context.req.raw));

	if (!guestId.success || !draft.success) {
		return jsonError('Write a note of up to 2,000 characters.');
	}

	return respond(await noteBook(context).add(guestId.data, draft.data), 201);
});

guestNoteRoutes.all('/guests/:guestId/notes', methodNotAllowed);

guestNoteRoutes.patch('/guest-notes/:noteId', withPermission('run:queue'), async (context) => {
	const noteId = idSchema.safeParse(context.req.param('noteId'));
	const revision = guestNoteRevisionSchema.safeParse(await jsonBody(context.req.raw));

	if (!noteId.success || !revision.success) {
		return jsonError('Write a note of up to 2,000 characters.');
	}

	return respond(await noteBook(context).revise(noteId.data, revision.data));
});

guestNoteRoutes.delete('/guest-notes/:noteId', withPermission('run:queue'), async (context) => {
	const noteId = idSchema.safeParse(context.req.param('noteId'));

	if (!noteId.success) {
		return jsonError('Invalid note.');
	}

	return respond(await noteBook(context).remove(noteId.data));
});

guestNoteRoutes.all('/guest-notes/:noteId', methodNotAllowed);

// Every worker filing a note reads the categories; only `manage:guest-notes` changes them.
guestNoteRoutes.get('/guest-note-categories', withPermission('run:queue'), async () =>
	Response.json(await GuestNoteCategories.list()),
);

guestNoteRoutes.post(
	'/guest-note-categories',
	withPermission('manage:guest-notes'),
	async (context) => {
		const draft = guestNoteCategoryDraftSchema.safeParse(await jsonBody(context.req.raw));

		if (!draft.success) {
			return jsonError('Name the category in 40 characters or fewer.');
		}

		const result = await GuestNoteCategories.add(draft.data.label);

		return result.ok
			? Response.json(result.category, { status: 201 })
			: jsonError(result.error, result.status);
	},
);

guestNoteRoutes.all('/guest-note-categories', methodNotAllowed);

guestNoteRoutes.patch(
	'/guest-note-categories/:categoryId',
	withPermission('manage:guest-notes'),
	async (context) => {
		const categoryId = idSchema.safeParse(context.req.param('categoryId'));
		const change = guestNoteCategoryChangeSchema.safeParse(await jsonBody(context.req.raw));

		if (!categoryId.success || !change.success) {
			return jsonError('Name the category in 40 characters or fewer.');
		}

		const result = await GuestNoteCategories.change(categoryId.data, change.data);

		return result.ok ? Response.json(result.category) : jsonError(result.error, result.status);
	},
);

guestNoteRoutes.all('/guest-note-categories/:categoryId', methodNotAllowed);

export default routeHandler(createRouter<AdminEnv>().route('/api/admin', guestNoteRoutes));
