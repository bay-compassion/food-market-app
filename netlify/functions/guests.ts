import { db } from '../../db/index.js';
import { guests } from '../../db/schema.js';

type GuestSubmission = {
	firstName: string;
	lastName: string;
	age: number;
	householdSize: number;
	phone: string;
	locale: 'en' | 'es';
};

function error(message: string, status = 400) {
	return Response.json({ error: message }, { status });
}

function parseSubmission(value: unknown): GuestSubmission | null {
	if (!value || typeof value !== 'object') {
		return null;
	}

	const body = value as Record<string, unknown>;
	const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
	const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
	const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
	const age = Number(body.age);
	const householdSize = Number(body.householdSize);
	const locale = body.locale;

	if (
		!firstName ||
		!lastName ||
		!phone ||
		firstName.length > 100 ||
		lastName.length > 100 ||
		phone.length > 40 ||
		!Number.isInteger(age) ||
		age < 0 ||
		age > 120 ||
		!Number.isInteger(householdSize) ||
		householdSize < 1 ||
		householdSize > 30 ||
		(locale !== 'en' && locale !== 'es')
	) {
		return null;
	}

	return { firstName, lastName, age, householdSize, phone, locale };
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
	if (!submission) {
		return error('Please provide valid guest information.');
	}

	const [guest] = await db.insert(guests).values(submission).returning({ id: guests.id });

	return Response.json(guest, { status: 201 });
};

export const config = { path: '/api/guests' };
