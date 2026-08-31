import { eq } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { guests } from '../../db/schema.mjs';
import { hashDeviceToken, issueDeviceToken, normalizePhone } from './guestCredentials.mjs';

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const guestLocales = ['en', 'es', 'fa', 'tl', 'vi', 'zh', 'ar'] as const;

export type GuestInformationSubmission = {
	firstName: string;
	lastName: string;
	phone: string;
	locale: (typeof guestLocales)[number];
	deviceToken: string | null;
};

export type SaveGuestInformationResult =
	| { ok: true; status: 200 | 201; body: { guestId: string; deviceToken?: string } }
	| { ok: false; status: number; error: string };

/** Parses identity fields without accepting any visit or household information. */
export function parseGuestInformation(value: unknown): GuestInformationSubmission | null {
	if (!value || typeof value !== 'object') {
		return null;
	}

	const body = value as Record<string, unknown>;
	const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
	const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
	const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
	const locale = body.locale;
	const rawDeviceToken = body.deviceToken;
	const deviceToken = typeof rawDeviceToken === 'string' ? rawDeviceToken.trim() : null;
	const normalizedPhone = normalizePhone(phone);

	if (
		!phone ||
		phone.length > 40 ||
		normalizedPhone.length < 8 ||
		normalizedPhone.length > 16 ||
		!guestLocales.some((item) => item === locale) ||
		(rawDeviceToken !== undefined &&
			rawDeviceToken !== null &&
			(!deviceToken || deviceToken.length < 32 || deviceToken.length > 200)) ||
		!firstName ||
		!lastName ||
		firstName.length > 100 ||
		lastName.length > 100
	) {
		return null;
	}

	return {
		firstName,
		lastName,
		phone,
		locale: locale as GuestInformationSubmission['locale'],
		deviceToken,
	};
}

/** Resolves the browser's device credential to the guest it identifies, if any. */
export async function findGuestByDeviceToken(deviceToken: string | null) {
	if (!deviceToken) {
		return null;
	}

	const [guest] = await db
		.select()
		.from(guests)
		.where(eq(guests.deviceTokenHash, hashDeviceToken(deviceToken)))
		.limit(1);

	return guest ?? null;
}

/**
 * Creates or updates identity fields using the caller's transaction. Lottery registration uses
 * this same operation so identity and visit changes commit atomically.
 */
export async function persistGuestInformation(
	tx: Transaction,
	options: {
		existingGuest: typeof guests.$inferSelect | null;
		information: Pick<GuestInformationSubmission, 'firstName' | 'lastName' | 'phone' | 'locale'>;
		deviceTokenHash: string | null;
	},
): Promise<typeof guests.$inferSelect> {
	if (options.existingGuest) {
		const [updated] = await tx
			.update(guests)
			.set({
				firstName: options.information.firstName,
				lastName: options.information.lastName,
				phone: options.information.phone,
				normalizedPhone: normalizePhone(options.information.phone),
				locale: options.information.locale,
			})
			.where(eq(guests.id, options.existingGuest.id))
			.returning();

		return updated!;
	}

	const [created] = await tx
		.insert(guests)
		.values({
			firstName: options.information.firstName,
			lastName: options.information.lastName,
			phone: options.information.phone,
			normalizedPhone: normalizePhone(options.information.phone),
			deviceTokenHash: options.deviceTokenHash,
			locale: options.information.locale,
		})
		.returning();

	return created!;
}

/** Saves identity only; this operation never creates or updates a visit. */
export async function saveGuestInformation(
	submission: GuestInformationSubmission,
): Promise<SaveGuestInformationResult> {
	const existingGuest = await findGuestByDeviceToken(submission.deviceToken);
	const deviceCredential = existingGuest ? null : issueDeviceToken();
	const result = await db.transaction(async (tx) => {
		const guest = await persistGuestInformation(tx, {
			existingGuest,
			information: submission,
			deviceTokenHash: deviceCredential?.tokenHash ?? null,
		});

		return { guestId: guest.id, deviceToken: deviceCredential?.token };
	});

	return { ok: true, status: existingGuest ? 200 : 201, body: result };
}
