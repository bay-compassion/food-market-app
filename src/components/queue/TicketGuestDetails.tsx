import styled from '@emotion/styled';
import { TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState, type FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { GuestDetails, QueueGuest } from '../../services/admin-api';
import { useQueueDesk } from './queue-desk-context';

const Form = styled.form`
	display: grid;
	gap: 12px;
	padding: 14px 16px 16px;
	border-radius: var(--radius-lg);
	background: var(--color-surface-soft);

	h3 {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 17px;
	}

	button {
		justify-self: start;
		min-height: 44px;
		padding: 0 18px;
		border: 1.5px solid var(--color-border);
		border-radius: var(--radius-pill);
		color: var(--color-text);
		background: var(--color-background);
		font-size: 15px;
		font-weight: 700;
	}

	button:disabled {
		opacity: 0.6;
	}
`;

function detailsOf(guest: QueueGuest): GuestDetails {
	return { pronunciation: guest.pronunciation ?? '', staffNotes: guest.staffNotes ?? '' };
}

/**
 * How to say the open ticket's name, and what staff keep about the guest, editable in place.
 *
 * The fields edit a draft rather than the guest: the line is reread every few seconds and replaces
 * the guest wholesale, which would otherwise wipe what the volunteer is typing. Render it with
 * `key={guest.guestId}` so opening another guest's ticket starts a fresh draft.
 */
export const TicketGuestDetails = observer(function TicketGuestDetails({
	guest,
}: {
	guest: QueueGuest;
}) {
	const t = adminTranslations.en.queueDesk.guestDetails;
	const desk = useQueueDesk();
	const [draft, setDraft] = useState(() => detailsOf(guest));
	const [isEdited, setIsEdited] = useState(false);
	const isSaving = desk.isSavingDetails(guest);

	const edit = (patch: Partial<GuestDetails>) => {
		setDraft((current) => ({ ...current, ...patch }));
		setIsEdited(true);
	};

	const save = async (event: FormEvent) => {
		event.preventDefault();

		const details = {
			pronunciation: draft.pronunciation.trim(),
			staffNotes: draft.staffNotes.trim(),
		};

		if (await desk.saveGuestDetails(guest, details)) {
			setDraft(details);
			setIsEdited(false);
		}
	};

	return (
		<Form className="ticket-guest-details" aria-label={t.title} onSubmit={save}>
			<h3>{t.title}</h3>
			<TextField
				label={t.pronunciation}
				helperText={t.pronunciationHelp}
				value={draft.pronunciation}
				onChange={(event) => edit({ pronunciation: event.target.value })}
				slotProps={{ htmlInput: { maxLength: 100 } }}
				autoComplete="off"
				size="small"
			/>
			<TextField
				label={t.staffNotes}
				helperText={t.staffNotesHelp}
				value={draft.staffNotes}
				onChange={(event) => edit({ staffNotes: event.target.value })}
				slotProps={{ htmlInput: { maxLength: 2_000 } }}
				multiline
				minRows={2}
				size="small"
			/>
			<button type="submit" disabled={!isEdited || isSaving}>
				{isSaving ? t.saving : t.save}
			</button>
		</Form>
	);
});
