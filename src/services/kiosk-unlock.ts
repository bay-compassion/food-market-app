/**
 * The wire shapes for unlocking a room display, shared by the server and the browser. See
 * `netlify/services/kiosk-access.mts` for how a code and a token are made and checked.
 */

/** What `POST /api/admin/kiosk/unlock-codes` returns to a worker. */
export type KioskUnlockCode = {
	/** Six digits, typed into the display. */
	code: string;
	/** When the code stops working, as an ISO timestamp: five to ten minutes after it was issued. */
	expiresAt: string;
};

/** What `POST /api/kiosk/unlock` returns to a display for a correct code. */
export type KioskUnlockResult = {
	/** Sent as a bearer token on every poll of `GET /api/kiosk/board`. */
	token: string;
};

/** A code as a display accepts it: exactly six digits, nothing else. */
export const kioskUnlockCodePattern = /^\d{6}$/;
