import {
	createRouter,
	jsonBody,
	jsonError,
	methodNotAllowed,
	routeHandler,
} from '../../lib/http.mjs';
import { parseGuestInformation, saveGuestInformation } from '../../services/guest-information.mjs';

export const guestInformationRoutes = createRouter();

guestInformationRoutes.post('/api/guest-information', async (context) => {
	const body = await jsonBody(context.req.raw);

	const submission = parseGuestInformation(body);

	if (!submission) {
		return jsonError('Please provide valid guest information.');
	}

	const result = await saveGuestInformation(submission);

	return result.ok
		? Response.json(result.body, { status: result.status })
		: jsonError(result.error, result.status);
});
guestInformationRoutes.all('/api/guest-information', methodNotAllowed);

export default routeHandler(guestInformationRoutes);
