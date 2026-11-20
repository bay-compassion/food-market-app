import type { QueueGuest } from '../services/admin-api';

/** The registration pool, the premarket, and guests who cancelled before the draw. */
export class RegistrationRoster {
	constructor(private readonly guests: readonly QueueGuest[]) {}

	get registered(): QueueGuest[] {
		return this.guests.filter((guest) => guest.status === 'registered');
	}

	/** Volunteers who shopped before the line, still there to be removed if they shouldn't be. */
	get premarket(): QueueGuest[] {
		return this.guests.filter((guest) => guest.track === 'premarket' && guest.status === 'served');
	}

	get cancelled(): QueueGuest[] {
		return this.guests.filter((guest) => guest.status === 'cancelled');
	}
}
