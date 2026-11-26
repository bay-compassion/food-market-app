import styled from '@emotion/styled';
import { Button, IconButton } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';

import { adminTranslations } from '../../../adminLocales';
import { useRootStore } from '../../../stores/react/store-context';
import { GuestProfileHeader } from './GuestProfileHeader';
import { GuestProfileOverview } from './GuestProfileOverview';
import { GuestProfileStats } from './GuestProfileStats';

const Panel = styled.aside`
	display: grid;
	align-content: start;
	gap: 14px;
	padding: 20px;
	border: 1.5px solid var(--color-border-soft);
	border-radius: var(--radius-lg);
	background: var(--color-surface);

	.close {
		justify-self: end;
		margin: -10px -10px -14px 0;
	}

	.message {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 14px;
	}
`;

/**
 * The guest database on a desk: the guest picked in the grid, beside it — who they are, their
 * record in four numbers, and the profile's Overview — so a worker can look someone up without
 * leaving the list. The full profile, with every visit, note, and linked record, is one click on.
 */
export const GuestProfilePanel = observer(function GuestProfilePanel({
	guestId,
	onClose,
	onOpenProfile,
}: {
	guestId: string;
	onClose: () => void;
	onOpenProfile: () => void;
}) {
	const t = adminTranslations.en.guestProfile;
	const store = useRootStore().admin.guestProfile;
	const profile = store.profile;

	useEffect(() => {
		void store.load(guestId);

		return () => store.close();
	}, [store, guestId]);

	return (
		<Panel aria-label={t.panelLabel}>
			<IconButton className="close" aria-label={t.closePanel} onClick={onClose}>
				<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
					<path
						d="M6 6l12 12M18 6L6 18"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
					/>
				</svg>
			</IconButton>
			{profile ? (
				<>
					<GuestProfileHeader profile={profile} />
					<GuestProfileStats profile={profile} />
					<Button variant="outlined" onClick={onOpenProfile}>
						{t.openFullProfile}
					</Button>
					<GuestProfileOverview
						profile={profile}
						onSeeAllVisits={onOpenProfile}
						onSeeAllNotes={onOpenProfile}
					/>
				</>
			) : store.loadFailed ? (
				<p className="message" role="alert">
					{t.loadFailed}
				</p>
			) : (
				<p className="message" role="status">
					{t.loading}
				</p>
			)}
		</Panel>
	);
});
