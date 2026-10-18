import styled from '@emotion/styled';
import { Button, TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { GuestDeletionPreview } from '../../services/guest-deletion';
import { isSamePhone } from '../../services/phoneFormat';
import { useRootStore } from '../../stores/react/store-context';
import { Dialog } from '../ui/Dialog';

// The dialog renders in a portal outside `.admin-dashboard`, so it carries its own styles.
const Body = styled.div`
	display: grid;
	gap: 16px;

	p,
	ul {
		margin: 0;
		line-height: 1.5;
	}

	ul {
		display: grid;
		gap: 4px;
		padding-inline-start: 20px;
	}

	.guest-delete-name {
		font-size: 20px;
		font-weight: 700;
	}

	.guest-delete-identity {
		color: var(--color-text-muted);
	}

	.guest-delete-warning {
		padding: 12px 14px;
		border-radius: var(--radius-sm);
		color: var(--color-text);
		background: var(--color-surface-soft);
		font-weight: 600;
	}

	.guest-delete-note {
		color: var(--color-text-muted);
		font-size: 14px;
	}
`;

/**
 * The deliberate last step before a guest is deleted for good: who they are, what goes with them,
 * and a field the admin must type the guest's phone number into before the button wakes up. The
 * server checks the number again, so the field is a speed bump for the admin, not the lock.
 *
 * Keyed on the guest by its parent, so a second guest opened after the first starts with an empty
 * field rather than the number typed for someone else.
 */
export const GuestDeletionDialog = observer(function GuestDeletionDialog() {
	const { admin } = useRootStore();
	const guest = admin.guestDeletion;

	return guest ? <GuestDeletionForm key={guest.guestId} guest={guest} /> : null;
});

const GuestDeletionForm = observer(function GuestDeletionForm({
	guest,
}: {
	guest: GuestDeletionPreview;
}) {
	const t = adminTranslations.en;
	const { admin } = useRootStore();
	const [typedPhone, setTypedPhone] = useState('');
	const name = `${guest.firstName} ${guest.lastName}`;
	const signedUp = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
		new Date(guest.signedUpAt),
	);
	const canDelete = !guest.inOpenSession && !admin.isBusy && isSamePhone(typedPhone, guest.phone);

	return (
		<Dialog
			open
			title={t.guestDeleteTitle}
			closeLabel={t.guestDeleteClose}
			onClose={() => admin.dismissGuestDeletion()}
			actions={
				<>
					<Button type="button" variant="text" onClick={() => admin.dismissGuestDeletion()}>
						{t.cancel}
					</Button>
					<Button
						type="button"
						color="error"
						variant="contained"
						disabled={!canDelete}
						onClick={() => void admin.deleteGuest(typedPhone)}
					>
						{t.guestDeleteConfirm}
					</Button>
				</>
			}
		>
			<Body>
				<div>
					<p className="guest-delete-name">{name}</p>
					<p className="guest-delete-identity">
						{t.guestDeleteIdentity
							.replace('{date}', signedUp)
							.replace('{digits}', guest.phone.replace(/\D/g, '').slice(-4))}
					</p>
				</div>
				{guest.inOpenSession ? (
					<p className="guest-delete-warning" role="alert">
						{t.guestDeleteInOpenSession}
					</p>
				) : (
					<>
						<p>{t.guestDeleteRemoves}</p>
						<ul>
							<li>{t.guestDeleteVisits.replace('{count}', String(guest.rows.visits))}</li>
							<li>{t.guestDeleteVisitHistory}</li>
							<li>{t.guestDeleteTextConsent}</li>
						</ul>
						<p className="guest-delete-warning">{t.guestDeleteIrreversible}</p>
						<TextField
							label={t.guestDeletePhoneLabel}
							helperText={t.guestDeletePhoneHint}
							value={typedPhone}
							onChange={(event) => setTypedPhone(event.target.value)}
							autoComplete="off"
							slotProps={{ htmlInput: { inputMode: 'tel' } }}
						/>
						<p className="guest-delete-note">{t.guestDeleteOutsideApp}</p>
					</>
				)}
			</Body>
		</Dialog>
	);
});
