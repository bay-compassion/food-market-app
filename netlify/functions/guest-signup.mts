import { Config } from '@netlify/functions';

import { parseSignupSubmission, registerGuestSignup } from '../services/guestRegistration.mjs';

function error(message: string, status = 400) {
	return Response.json({ error: message }, { status });
}

export default async (request: Request) => {
	if (request.method !== 'POST') {
		return error('Method not allowed', 405);
	}

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return error('Request body must be valid JSON.');
	}

	const submission = parseSignupSubmission(body);

	if (!submission) {
		return error('Please provide valid guest information.');
	}

	const result = await registerGuestSignup(submission);

	return result.ok
		? Response.json(result.body, { status: result.status })
		: error(result.error, result.status);
};

export const config: Config = { path: '/api/guest-signup' };
