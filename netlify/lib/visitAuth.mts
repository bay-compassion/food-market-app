import { eq } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { visits } from '../../db/schema.mjs';
import { hashVisitToken } from '../services/guestCredentials.mjs';

/** Resolves the visit a bearer token authorizes, shared by the push and SMS subscription endpoints. */
export async function authorizedVisit(request: Request) {
	const authorization = request.headers.get('authorization');
	const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
	if (!token || token.length < 32 || token.length > 200) {
		return null;
	}
	const [visit] = await db
		.select({ id: visits.id, status: visits.status })
		.from(visits)
		.where(eq(visits.accessTokenHash, hashVisitToken(token)))
		.limit(1);

	return visit ?? null;
}
