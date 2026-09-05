import { useEffect, useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { GuestAdmission } from '../../services/guestAdmission';
import { ManualGuestDialog } from './ManualGuestDialog';
import type { ManualGuest } from './types';

export type AddGuestSectionProps = {
	admissions: GuestAdmission[];
	busy?: boolean;
	onAddGuest: (guest: ManualGuest) => void;
};

/**
 * Whether the manual guest dialog is open, and whether it may be. A session that cannot accept
 * anyone right now offers no dialog, and closes one that was already open.
 */
export function useManualGuestForm(admissions: GuestAdmission[]) {
	const [isOpen, setIsOpen] = useState(false);
	const canAdd = admissions.length > 0;

	useEffect(() => {
		if (!canAdd) {
			setIsOpen(false);
		}
	}, [canAdd]);

	return {
		canAdd,
		isOpen: canAdd && isOpen,
		open: () => setIsOpen(true),
		close: () => setIsOpen(false),
	};
}

/**
 * The "add a guest by hand" button and the dialog it opens, shared by every admin screen that
 * offers it.
 */
export function AddGuestSection({ admissions, busy, onAddGuest }: AddGuestSectionProps) {
	const t = adminTranslations.en;
	const form = useManualGuestForm(admissions);

	if (!form.canAdd) {
		return null;
	}

	function addGuest(guest: ManualGuest) {
		form.close();
		onAddGuest(guest);
	}

	return (
		<section className="admin-section">
			<button className="add-guest-button" type="button" onClick={form.open}>
				+ {t.addGuest}
			</button>
			<ManualGuestDialog
				open={form.isOpen}
				admissions={admissions}
				busy={busy}
				onSubmit={addGuest}
				onClose={form.close}
			/>
		</section>
	);
}
