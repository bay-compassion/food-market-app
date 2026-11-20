import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { registerGuest, validateSubmission } from '../../services/guestRegistration.mjs';
import { currentPremarket } from '../../services/premarket-session.mjs';
import { guestActor } from '../../services/visit-events.mjs';

const notOpen = 'The premarket is not open.';

export const premarketRegistrationRoutes = createRouter();

/** Whether the current session's premarket takes check-ins right now. */
premarketRegistrationRoutes.get('/api/premarket-status', async () => {
	const session = await currentPremarket();

	return Response.json({ open: session?.open ?? false });
});
premarketRegistrationRoutes.all('/api/premarket-status', methodNotAllowed);

/**
 * A volunteer checking in for the premarket on their own phone. The link is the same every week,
 * so the session comes from the server, never the request.
 */
premarketRegistrationRoutes.post('/api/premarket-registration', async (context) => {
	// The form is checked before the session is looked up, so a bad request never reaches the database.
	const validation = validateSubmission({
		...((await jsonBody(context.req.raw)) as Record<string, unknown>),
		source: 'self',
		marketEventId: undefined,
	});

	if (!validation.success) {
		return Response.json({ error: validation.error, fields: validation.fields }, { status: 400 });
	}

	const session = await currentPremarket();

	if (!session) {
		return jsonError(notOpen, 409);
	}

	const result = await registerGuest(
		{ ...validation.data, marketEventId: session.marketEventId },
		guestActor,
		{ premarket: true },
	);

	// The phone never named the session, so it is told which one its visit token belongs to.
	return result.ok
		? Response.json(
				{ ...result.body, marketEventId: session.marketEventId },
				{ status: result.status },
			)
		: jsonError(result.error, result.status);
});
premarketRegistrationRoutes.all('/api/premarket-registration', methodNotAllowed);

export default routeHandler(premarketRegistrationRoutes);
