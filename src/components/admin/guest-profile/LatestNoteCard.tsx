import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

import { adminTranslations } from '../../../adminLocales';
import { useRootStore } from '../../../stores/react/store-context';
import { GuestNoteItem } from '../../queue/GuestNoteItem';
import { ProfileCard } from './ProfileCard';

const Notes = styled.ol`
	margin: 0;
	padding: 0;
	list-style: none;
`;

/**
 * The Overview's look at the notes staff keep about the guest: the newest one, and the way to the
 * rest on the Notes tab. Render it with `key={guestId}` so another guest's profile reads its own.
 */
export const LatestNoteCard = observer(function LatestNoteCard({
	guestId,
	onSeeAll,
}: {
	guestId: string;
	onSeeAll: () => void;
}) {
	const t = adminTranslations.en.guestProfile;
	const notesCopy = adminTranslations.en.queueDesk.guestNotes;
	const { admin } = useRootStore();
	const [store] = useState(() => admin.createGuestNotesStore(guestId));
	const notes = store.notes;
	const latest = notes?.latest ?? null;

	useEffect(() => {
		void store.load();
	}, [store]);

	return (
		<ProfileCard aria-labelledby="guest-profile-latest-note">
			<header>
				<h3 id="guest-profile-latest-note">{notesCopy.title}</h3>
				<Button size="small" onClick={onSeeAll}>
					{notes && notes.count > 1
						? t.seeAllNotes.replace('{count}', String(notes.count))
						: t.openNotes}
				</Button>
			</header>
			{store.loadFailed ? (
				<p className="subtle">{notesCopy.loadFailed}</p>
			) : notes === null ? null : latest ? (
				<Notes>
					<GuestNoteItem note={latest} store={store} />
				</Notes>
			) : (
				<p className="subtle">{notesCopy.empty}</p>
			)}
		</ProfileCard>
	);
});
