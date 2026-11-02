import useMediaQuery from '@mui/material/useMediaQuery';
import { useEffect, useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { ManualAdmission } from '../../services/guestAdmission';
import { AddGuestFab } from './AddGuestFab';
import { wideLayoutQuery } from './admin-layout';
import { ManualGuestDialog } from './ManualGuestDialog';
import type { ManualGuest } from './types';

export type AddGuestSectionProps = {
	admissions: ManualAdmission[];
	busy?: boolean;
	onAddGuest: (guest: ManualGuest) => void;
};

/**
 * Whether the manual guest dialog is open, and whether it may be. A session that cannot accept
 * anyone right now offers no dialog, and closes one that was already open.
 */
export function useManualGuestForm(admissions: ManualAdmission[]) {
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
 * Adding a guest by hand and the dialog it opens, shared by every admin screen that offers it. On a
 * phone it floats, since it is needed at unpredictable moments from anywhere on a long screen.
 */
export function AddGuestSection({ admissions, busy, onAddGuest }: AddGuestSectionProps) {
	const t = adminTranslations.en;
	const form = useManualGuestForm(admissions);
	const isWide = useMediaQuery(wideLayoutQuery);

	if (!form.canAdd) {
		return null;
	}

	function addGuest(guest: ManualGuest) {
		form.close();
		onAddGuest(guest);
	}

	return (
		<>
			{isWide ? (
				<section className="admin-section">
					<button className="add-guest-button" type="button" onClick={form.open}>
						+ {t.addGuest}
					</button>
				</section>
			) : (
				<AddGuestFab onClick={form.open} />
			)}
			<ManualGuestDialog
				open={form.isOpen}
				admissions={admissions}
				busy={busy}
				onSubmit={addGuest}
				onClose={form.close}
			/>
		</>
	);
}
