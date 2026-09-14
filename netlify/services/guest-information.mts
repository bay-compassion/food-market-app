import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../../db/index.mjs';
import { guests } from '../../db/schema.mjs';
import { tracedQuery } from '../lib/sentry.mjs';
import { hashDeviceToken, issueDeviceToken, normalizePhone } from './guestCredentials.mjs';

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const guestLocales = ['en', 'es', 'fa', 'tl', 'vi', 'zh', 'ar'] as const;

/** A guest's own name, as they typed it. */
export const guestNameSchema = z.string().trim().min(1).max(100);

/** Accepted as typed, but only if it still dials once punctuation is stripped. */
export const phoneSchema = z
	.string()
	.trim()
	.min(1)
	.max(40)
	.refine((phone) => {
		const digits = normalizePhone(phone);

		return digits.length >= 8 && digits.length <= 16;
	}, 'A phone number must have between 8 and 16 digits.');

/**
 * The credential this browser saved on a previous visit. Absent on a first visit, but anything
 * present has to be a plausible token rather than silently treated as a new device.
 */
export const deviceTokenSchema = z
	.string()
	.trim()
	.min(32)
	.max(200)
	.nullish()
	.transform((token) => token ?? null);

/** The identity fields every guest-facing submission carries. */
export const guestIdentitySchema = z.object({
	firstName: guestNameSchema,
	lastName: guestNameSchema,
	phone: phoneSchema,
	locale: z.enum(guestLocales),
});

export const guestInformationSchema = guestIdentitySchema.extend({
	deviceToken: deviceTokenSchema,
});

export type GuestInformationSubmission = z.infer<typeof guestInformationSchema>;

export type SaveGuestInformationResult =
	| { ok: true; status: 200 | 201; body: { guestId: string; deviceToken?: string } }
	| { ok: false; status: number; error: string };

/** Parses identity fields without accepting any visit or household information. */
export function parseGuestInformation(value: unknown): GuestInformationSubmission | null {
	return guestInformationSchema.safeParse(value).data ?? null;
}

/** Resolves the browser's device credential to the guest it identifies, if any. */
export async function findGuestByDeviceToken(deviceToken: string | null) {
	if (!deviceToken) {
		return null;
	}

	const [guest] = await tracedQuery('guest.by_device_token', () =>
		db
			.select()
			.from(guests)
			.where(eq(guests.deviceTokenHash, hashDeviceToken(deviceToken)))
			.limit(1),
	);

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

/**
 * A worker saving someone's details without admitting them to any session — possible at any time,
 * including between sessions. Gated behind `run:queue` by the admin route that parses it.
 */
export const adminProfileSchema = guestIdentitySchema.extend({
	source: z.literal('admin'),
	admission: z.literal('profile'),
});

export type AdminProfileSubmission = z.infer<typeof adminProfileSchema>;

/**
 * Creates a guest with no visit and no device credential. A phone takes the record over later by
 * redeeming a worker's QR code — see `guest-claim.mts`.
 */
export async function createGuestProfile(
	submission: AdminProfileSubmission,
): Promise<{ id: null; guestId: string }> {
	const guest = await tracedQuery('guest.create_profile', () =>
		db.transaction((tx) =>
			persistGuestInformation(tx, {
				existingGuest: null,
				information: submission,
				deviceTokenHash: null,
			}),
		),
	);

	return { id: null, guestId: guest.id };
}

/** Saves identity only; this operation never creates or updates a visit. */
export async function saveGuestInformation(
	submission: GuestInformationSubmission,
): Promise<SaveGuestInformationResult> {
	const existingGuest = await findGuestByDeviceToken(submission.deviceToken);
	const deviceCredential = existingGuest ? null : issueDeviceToken();
	const result = await tracedQuery('guest.save_information', () =>
		db.transaction(async (tx) => {
			const guest = await persistGuestInformation(tx, {
				existingGuest,
				information: submission,
				deviceTokenHash: deviceCredential?.tokenHash ?? null,
			});

			return { guestId: guest.id, deviceToken: deviceCredential?.token };
		}),
	);

	return { ok: true, status: existingGuest ? 200 : 201, body: result };
}
