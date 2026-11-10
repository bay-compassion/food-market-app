import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';

/** The guest whose record a claim code would hand over. */
export type ClaimableGuest = {
	guestId: string;
	firstName: string;
	lastName: string;
	phone: string;
};

/**
 * Showing the QR code that puts a guest on a phone, for a manager (`manage:guest-access`) — any
 * guest, at any time, including one already on another phone. It asks first: the code hands over
 * the guest's record and place in line, so the manager has to know who they are handing it to.
 *
 * `null` when this worker can't show one. Read inside an `observer()` component, so it follows a
 * change of permissions. The code opens in `GuestClaimDialog`, which the screen mounts.
 */
export function useShowGuestClaim(): ((guest: ClaimableGuest) => Promise<void>) | null {
	const t = adminTranslations.en;
	const { admin, confirmation } = useRootStore();

	if (!admin.can('manage:guest-access')) {
		return null;
	}

	return async (guest) => {
		const name = `${guest.firstName} ${guest.lastName}`;
		const confirmed = await confirmation.ask({
			question: t.guestClaimConfirm.replace('{name}', name),
			details: [
				t.guestClaimConfirmIdentity.replace('{name}', name).replace('{phone}', guest.phone),
				t.guestClaimConfirmReplacesPhone,
			],
			confirmLabel: t.guestClaimShow,
			dismissLabel: t.cancel,
		});

		if (confirmed) {
			await admin.showGuestClaim({ guestId: guest.guestId, name });
		}
	};
}
