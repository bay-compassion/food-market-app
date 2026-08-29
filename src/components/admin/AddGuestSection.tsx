import { useEffect, useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { GuestAdmission } from '../../services/guestAdmission';
import { ManualGuestForm } from './ManualGuestForm';
import type { ManualGuest } from './types';

export type AddGuestSectionProps = {
	admissions: GuestAdmission[];
	busy?: boolean;
	onAddGuest: (guest: ManualGuest) => void;
};

/**
 * The "add a guest by hand" control, shared by every admin screen that offers it. A session that
 * cannot accept anyone right now offers no button at all.
 */
export function AddGuestSection({ admissions, busy, onAddGuest }: AddGuestSectionProps) {
	const t = adminTranslations.en;
	const [showForm, setShowForm] = useState(false);
	const canAdd = admissions.length > 0;

	useEffect(() => {
		if (!canAdd) {
			setShowForm(false);
		}
	}, [canAdd]);

	if (!canAdd) {
		return null;
	}

	function addGuest(guest: ManualGuest) {
		setShowForm(false);
		onAddGuest(guest);
	}

	return (
		<section className="admin-section">
			<div className="section-heading">
				<h2>{t.addGuest}</h2>
				{!showForm ? (
					<button className="add-guest-button" type="button" onClick={() => setShowForm(true)}>
						+ {t.addGuest}
					</button>
				) : null}
			</div>
			{showForm ? (
				<ManualGuestForm
					admissions={admissions}
					busy={busy}
					onSubmit={addGuest}
					onCancel={() => setShowForm(false)}
				/>
			) : null}
		</section>
	);
}
