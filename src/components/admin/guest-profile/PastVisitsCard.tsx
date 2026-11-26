import styled from '@emotion/styled';
import { Button } from '@mui/material';

import { adminTranslations } from '../../../adminLocales';
import type { GuestProfileVisit } from '../../../models/guest-profile';
import { ProfileCard } from './ProfileCard';
import { VisitSummary } from './VisitSummary';

const List = styled.ol`
	display: grid;
	margin: 0;
	padding: 0;
	list-style: none;

	li {
		display: flex;
		padding: 10px 0;
		border-top: 1px solid var(--color-divider);
	}
`;

/** The Overview's look at the guest's visits before today's: the latest few, and the way to the rest. */
export function PastVisitsCard({
	visits,
	onSeeAll,
}: {
	visits: GuestProfileVisit[];
	onSeeAll: () => void;
}) {
	const t = adminTranslations.en.guestProfile;
	const shown = visits.slice(0, PastVisitsCard.shown);

	return (
		<ProfileCard aria-labelledby="guest-profile-past-visits">
			<header>
				<h3 id="guest-profile-past-visits">{t.recentTitle}</h3>
				{visits.length > shown.length ? (
					<Button size="small" onClick={onSeeAll}>
						{t.seeAllVisits}
					</Button>
				) : null}
			</header>
			{visits.length === 0 ? (
				<p className="subtle">{t.noPastVisits}</p>
			) : (
				<List>
					{shown.map((visit) => (
						<li key={visit.id}>
							<VisitSummary visit={visit} />
						</li>
					))}
				</List>
			)}
		</ProfileCard>
	);
}

/** How many earlier visits the Overview lists before handing over to the Visits tab. */
PastVisitsCard.shown = 3;
