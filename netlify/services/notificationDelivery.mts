import type { DeliveryType } from './pushNotifications.mjs';

export type NotificationDeliveryOptions = {
	claimId?: string;
	marketEventId?: string;
	visitIds?: string[];
	types?: DeliveryType[];
	dedupeKeys?: string[];
	limit?: number;
};

export type NotificationDeliveryResult = {
	sent: number;
	failed: number;
	skipped: number;
	/** Number of rows examined; older callers only consume the delivery outcome counters. */
	processed?: number;
};
