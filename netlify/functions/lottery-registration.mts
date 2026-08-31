import { Config } from '@netlify/functions';

import { parseSubmission, registerGuest } from '../services/guestRegistration.mjs';

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

	const submission = parseSubmission(body);

	if (!submission || submission.source !== 'self') {
		return error('Please provide a valid lottery registration.');
	}

	const result = await registerGuest(submission);

	return result.ok
		? Response.json(result.body, { status: result.status })
		: error(result.error, result.status);
};

export const config: Config = { path: '/api/lottery-registration' };
