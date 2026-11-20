import { z } from 'zod';

import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { registerGuest, validateSubmission } from '../../services/guestRegistration.mjs';
import { premarketSessionFor } from '../../services/premarket-code.mjs';
import { guestActor } from '../../services/visit-events.mjs';

const codeSchema = z.object({ code: z.string().trim().min(16).max(200) });

const invalidCode = 'This code is no longer valid. Ask the volunteer coordinator for the new one.';

export const premarketRegistrationRoutes = createRouter();

/**
 * Whether a scanned code opens a premarket right now. The code travels in the body, never the
 * address, so it stays out of request logs.
 */
premarketRegistrationRoutes.post('/api/premarket-status', async (context) => {
	const parsed = codeSchema.safeParse(await jsonBody(context.req.raw));

	if (!parsed.success) {
		return jsonError('Please provide a valid code.');
	}

	// Unknown and replaced codes answer identically, so the endpoint reveals nothing.
	const session = await premarketSessionFor(parsed.data.code);

	return session ? Response.json({ open: session.open }) : jsonError(invalidCode, 410);
});
premarketRegistrationRoutes.all('/api/premarket-status', methodNotAllowed);

/**
 * A volunteer registering for the premarket on their own phone. The session comes from the code,
 * never the request: a printed code outlives any one week's session.
 */
premarketRegistrationRoutes.post('/api/premarket-registration', async (context) => {
	const body = await jsonBody(context.req.raw);
	const parsed = codeSchema.safeParse(body);

	if (!parsed.success) {
		return jsonError('Please provide a valid code.');
	}

	const session = await premarketSessionFor(parsed.data.code);

	if (!session) {
		return jsonError(invalidCode, 410);
	}

	const validation = validateSubmission({
		...(body as Record<string, unknown>),
		source: 'self',
		marketEventId: session.marketEventId,
	});

	if (!validation.success) {
		return Response.json({ error: validation.error, fields: validation.fields }, { status: 400 });
	}

	const result = await registerGuest(validation.data, guestActor, { premarket: true });

	return result.ok
		? Response.json(result.body, { status: result.status })
		: jsonError(result.error, result.status);
});
premarketRegistrationRoutes.all('/api/premarket-registration', methodNotAllowed);

export default routeHandler(premarketRegistrationRoutes);
