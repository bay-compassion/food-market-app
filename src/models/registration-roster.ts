import type { QueueGuest } from '../services/admin-api';

/** The registration pool and guests who cancelled before the draw. */
export class RegistrationRoster {
	constructor(private readonly guests: readonly QueueGuest[]) {}

	get registered(): QueueGuest[] {
		return this.guests.filter((guest) => guest.status === 'registered');
	}

	get cancelled(): QueueGuest[] {
		return this.guests.filter((guest) => guest.status === 'cancelled');
	}
}
