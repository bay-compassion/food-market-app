import { eq } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { guests } from '../../db/schema.mjs';
import { hashDeviceToken } from '../services/guestCredentials.mjs';

/** Resolves the guest authorized by the browser-local device credential. */
export async function authorizedGuest(request: Request) {
	const authorization = request.headers.get('authorization');
	const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

	if (!token || token.length < 32 || token.length > 200) {
		return null;
	}

	const [guest] = await db
		.select({ id: guests.id })
		.from(guests)
		.where(eq(guests.deviceTokenHash, hashDeviceToken(token)))
		.limit(1);

	return guest ?? null;
}
