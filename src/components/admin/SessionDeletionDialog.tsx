import styled from '@emotion/styled';
import { Button, TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import {
	matchesSessionConfirmation,
	type SessionDeletionPreview,
} from '../../services/session-deletion';
import { useRootStore } from '../../stores/react/store-context';
import { Dialog } from '../ui/Dialog';
import { SessionDeletionWarehouseNotice } from './SessionDeletionWarehouseNotice';

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

	.session-delete-when {
		font-size: 20px;
		font-weight: 700;
	}

	.session-delete-warning {
		padding: 12px 14px;
		border-radius: var(--radius-sm);
		color: var(--color-text);
		background: var(--color-surface-soft);
		font-weight: 600;
	}

	.session-delete-note {
		color: var(--color-text-muted);
		font-size: 14px;
	}
`;

/**
 * The deliberate last step before a finished test session is deleted for good: which session, what
 * goes with it — naming every guest record deleted alongside, so a real guest among the testers is
 * caught — and a field the steward must type the session's date and start time into before the
 * button wakes up. The time tells apart two sessions on one day. The server checks it again, so
 * the field is a speed bump, not the lock.
 *
 * Keyed on the session, so a second session opened after the first starts with an empty field.
 */
export const SessionDeletionDialog = observer(function SessionDeletionDialog() {
	const { admin } = useRootStore();
	const session = admin.sessionDeletion.preview;

	return session ? <SessionDeletionForm key={session.marketEventId} session={session} /> : null;
});

const SessionDeletionForm = observer(function SessionDeletionForm({
	session,
}: {
	session: SessionDeletionPreview;
}) {
	const t = adminTranslations.en.sessionDeletion;
	const { admin, translations } = useRootStore();
	const deletion = admin.sessionDeletion;
	const [typed, setTyped] = useState('');
	const [forced, setForced] = useState(false);
	const opens = new Date(session.registrationOpensAt);
	const when = new Intl.DateTimeFormat(translations.locale, {
		dateStyle: 'full',
		timeStyle: 'short',
	}).format(opens);
	const warehoused = session.blockedBy === 'warehoused';
	// A session still running cannot be deleted at all; a warehoused one only once the box is ticked.
	const offered = session.blockedBy !== 'not-ended' && (!warehoused || forced);
	const canDelete =
		offered && !deletion.isDeleting && matchesSessionConfirmation(typed, session.confirmation);
	const count = (template: string, value: number) => template.replace('{count}', String(value));

	return (
		<Dialog
			open
			title={t.title}
			closeLabel={t.close}
			onClose={() => deletion.dismiss()}
			actions={
				<>
					<Button type="button" variant="text" onClick={() => deletion.dismiss()}>
						{adminTranslations.en.cancel}
					</Button>
					<Button
						type="button"
						color="error"
						variant="contained"
						disabled={!canDelete}
						onClick={() => void deletion.delete(typed, { force: warehoused && forced })}
					>
						{t.confirm}
					</Button>
				</>
			}
		>
			<Body>
				<p className="session-delete-when">{when}</p>
				{session.blockedBy === 'not-ended' ? (
					<p className="session-delete-warning" role="alert">
						{t.notEnded}
					</p>
				) : null}
				{warehoused ? (
					<SessionDeletionWarehouseNotice
						snapshots={session.coveringSnapshots}
						forced={forced}
						onForcedChange={setForced}
					/>
				) : null}
				{offered ? (
					<>
						<p>{t.intro}</p>
						<p>{t.removes}</p>
						<ul>
							<li>{count(t.visits, session.rows.visits)}</li>
							{session.rows.household_service_entries ? (
								<li>{count(t.households, session.rows.household_service_entries)}</li>
							) : null}
						</ul>
						{session.sessionOnlyGuests.length ? (
							<>
								<p>{count(t.guestsDeleted, session.sessionOnlyGuests.length)}</p>
								<ul aria-label={count(t.guestsDeleted, session.sessionOnlyGuests.length)}>
									{session.sessionOnlyGuests.map((guest) => (
										<li key={guest.guestId}>
											{guest.firstName} {guest.lastName}
										</li>
									))}
								</ul>
							</>
						) : null}
						{session.keptGuests ? (
							<p className="session-delete-note">{count(t.guestsKept, session.keptGuests)}</p>
						) : null}
						<p className="session-delete-warning">{t.irreversible}</p>
						<TextField
							label={t.confirmLabel}
							helperText={t.confirmHint.replace('{confirmation}', session.confirmation)}
							value={typed}
							onChange={(event) => setTyped(event.target.value)}
							autoComplete="off"
						/>
					</>
				) : null}
			</Body>
		</Dialog>
	);
});
