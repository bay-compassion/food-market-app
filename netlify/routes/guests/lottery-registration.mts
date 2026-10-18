import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { registerGuest, validateSubmission } from '../../services/guestRegistration.mjs';
import { guestActor } from '../../services/visit-events.mjs';

export const lotteryRegistrationRoutes = createRouter();

lotteryRegistrationRoutes.post('/api/lottery-registration', async (context) => {
	const body = await jsonBody(context.req.raw);

	const validation = validateSubmission(body);

	if (!validation.success) {
		return Response.json({ error: validation.error, fields: validation.fields }, { status: 400 });
	}

	const submission = validation.data;

	if (submission.source !== 'self') {
		return jsonError('Please provide a valid lottery registration.');
	}

	const result = await registerGuest(submission, guestActor);

	return result.ok
		? Response.json(result.body, { status: result.status })
		: jsonError(result.error, result.status);
});
lotteryRegistrationRoutes.all('/api/lottery-registration', methodNotAllowed);

export default routeHandler(lotteryRegistrationRoutes);
