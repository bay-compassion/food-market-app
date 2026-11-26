import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../../adminLocales';
import type { GuestProfile } from '../../../models/guest-profile';
import { useShowGuestClaim } from '../use-show-guest-claim';
import { ProfileCard } from './ProfileCard';

const Facts = styled.ul`
	display: grid;
	gap: 4px;
	margin: 0;
	padding: 0;
	list-style: none;
	font-size: 15px;
`;

/**
 * Whether the guest has their record on a phone and gets text alerts, and — for a manager
 * (`manage:guest-access`) — the QR code that puts it on a new one.
 */
export const AppAccessCard = observer(function AppAccessCard({
	profile,
}: {
	profile: GuestProfile;
}) {
	const t = adminTranslations.en.guestProfile;
	const showGuestClaim = useShowGuestClaim();

	return (
		<ProfileCard aria-labelledby="guest-profile-access">
			<header>
				<h3 id="guest-profile-access">{t.accessTitle}</h3>
			</header>
			<Facts>
				<li>{profile.onPhone ? t.onPhone : t.notOnPhone}</li>
				<li>{profile.textAlerts ? t.textAlertsOn : t.textAlertsOff}</li>
			</Facts>
			{showGuestClaim ? (
				<>
					<Button
						variant="outlined"
						onClick={() =>
							void showGuestClaim({
								guestId: profile.guestId,
								firstName: profile.firstName,
								lastName: profile.lastName,
								phone: profile.phone,
							})
						}
					>
						{profile.onPhone ? t.moveToPhone : t.putOnPhone}
					</Button>
					{profile.onPhone ? <p className="subtle">{t.moveToPhoneHelp}</p> : null}
				</>
			) : null}
		</ProfileCard>
	);
});
