import { z } from 'zod';

import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { registerGuest, validateSubmission } from '../../services/guestRegistration.mjs';
import { issueStandbyTicket } from '../../services/standby.mjs';
import { guestActor } from '../../services/visit-events.mjs';

const ticketRequestSchema = z.object({ code: z.string().min(1).max(200) });
const registrationSchema = z.object({
	ticket: z.string().min(32).max(200),
	marketEventId: z.uuid(),
});

/**
 * Standby, for a guest at the market. Scanning the session's code on an iPad pulls a ticket — the
 * next S number, held while they fill in their details — and the form then spends it. Nothing here
 * is linked from the guest app: only someone who scanned the code at the market reaches it. See
 * `docs/standby.md`.
 */
export const standbyRegistrationRoutes = createRouter();

/** Pulls a ticket for the code a guest scanned, once standby has opened. */
standbyRegistrationRoutes.post('/api/standby-ticket', async (context) => {
	const body = ticketRequestSchema.safeParse(await jsonBody(context.req.raw));

	if (!body.success) {
		return jsonError('Please provide a valid code.');
	}

	const result = await issueStandbyTicket(body.data.code);

	return result.ok
		? Response.json({
				ticket: result.ticket,
				standbyNumber: result.standbyNumber,
				marketEventId: result.marketEventId,
			})
		: jsonError(result.error, result.status);
});
standbyRegistrationRoutes.all('/api/standby-ticket', methodNotAllowed);

/** The guest's details, spending their ticket: their visit joins the standby list. */
standbyRegistrationRoutes.post('/api/standby-registration', async (context) => {
	const raw = (await jsonBody(context.req.raw)) as Record<string, unknown>;
	const held = registrationSchema.safeParse(raw);

	if (!held.success) {
		return jsonError('Please provide a valid standby ticket.');
	}

	// The form is checked before anything is read, so a bad request never reaches the database.
	const validation = validateSubmission({
		...raw,
		source: 'self',
		marketEventId: held.data.marketEventId,
	});

	if (!validation.success) {
		return Response.json({ error: validation.error, fields: validation.fields }, { status: 400 });
	}

	const result = await registerGuest(validation.data, guestActor, {
		standbyTicket: held.data.ticket,
	});

	return result.ok
		? Response.json(
				{ ...result.body, marketEventId: held.data.marketEventId },
				{ status: result.status },
			)
		: jsonError(result.error, result.status);
});
standbyRegistrationRoutes.all('/api/standby-registration', methodNotAllowed);

export default routeHandler(standbyRegistrationRoutes);
