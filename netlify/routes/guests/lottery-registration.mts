import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { parseSubmission, registerGuest } from '../../services/guestRegistration.mjs';

export const lotteryRegistrationRoutes = createRouter();

lotteryRegistrationRoutes.post('/api/lottery-registration', async (context) => {
	const body = await jsonBody(context.req.raw);

	const submission = parseSubmission(body);

	if (!submission || submission.source !== 'self') {
		return jsonError('Please provide a valid lottery registration.');
	}

	const result = await registerGuest(submission);

	return result.ok
		? Response.json(result.body, { status: result.status })
		: jsonError(result.error, result.status);
});
lotteryRegistrationRoutes.all('/api/lottery-registration', methodNotAllowed);

export default routeHandler(lotteryRegistrationRoutes);
