import { db } from '../../db/index.mjs';
import { PremarketWindow } from '../../src/models/premarket-window.js';
import { locationById } from './marketLocation.mjs';
import { getCurrentEvent } from './marketSession.mjs';

/** The session a volunteer's premarket check-in joins, and whether it takes check-ins now. */
export type PremarketSession = { marketEventId: string; open: boolean };

/**
 * The current session's premarket, or `null` when no session is coming up. The premarket link is
 * the same every week, so the session always comes from the server, never from the volunteer.
 */
export async function currentPremarket(now = new Date()): Promise<PremarketSession | null> {
	const event = await getCurrentEvent();

	if (!event) {
		return null;
	}

	const location = await locationById(db, event.locationId);

	return { marketEventId: event.id, open: new PremarketWindow(event, location).isOpenAt(now) };
}
