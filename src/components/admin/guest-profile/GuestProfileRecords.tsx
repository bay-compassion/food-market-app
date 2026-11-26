import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router';

import { adminTranslations } from '../../../adminLocales';
import type { GuestProfile } from '../../../models/guest-profile';
import { useRootStore } from '../../../stores/react/store-context';
import { AppAccessCard } from './AppAccessCard';
import { ProfileCard } from './ProfileCard';
import { RelatedRecordsCard } from './RelatedRecordsCard';

const StewardsOnly = styled(ProfileCard)`
	border-style: dashed;

	.badge {
		padding: 3px 10px;
		border-radius: var(--radius-pill);
		background: var(--color-surface-muted);
		color: var(--color-text-muted);
		font-size: 12px;
		font-weight: 700;
	}

	a {
		justify-self: start;
		color: var(--color-brand);
		font-weight: 700;
	}
`;

/**
 * The Records tab: the other records linked to this guest, whether their record is on a phone,
 * for a steward the way to their odds, and for the data steward (`delete:guest-data`) permanent
 * deletion, which opens the dashboard's typed-confirmation dialog.
 */
export const GuestProfileRecords = observer(function GuestProfileRecords({
	profile,
	onOpenGuest,
}: {
	profile: GuestProfile;
	onOpenGuest: (guestId: string) => void;
}) {
	const t = adminTranslations.en;
	const { admin } = useRootStore();

	return (
		<>
			<RelatedRecordsCard onOpenGuest={onOpenGuest} />
			<AppAccessCard profile={profile} />
			{admin.can('read:stewardship') ? (
				<StewardsOnly aria-labelledby="guest-profile-odds">
					<header>
						<h3 id="guest-profile-odds">{t.guestProfile.oddsTitle}</h3>
						<span className="badge">{t.guestProfile.stewardsOnly}</span>
					</header>
					<p className="subtle">{t.guestProfile.oddsHelp}</p>
					<Link to="/steward">{t.guestProfile.openStewardArea}</Link>
				</StewardsOnly>
			) : null}
			{admin.can('delete:guest-data') ? (
				<Button
					variant="outlined"
					color="error"
					disabled={admin.isBusy}
					onClick={() => void admin.openGuestDeletion(profile.guestId)}
				>
					{t.guestDeleteShow}
				</Button>
			) : null}
		</>
	);
});
