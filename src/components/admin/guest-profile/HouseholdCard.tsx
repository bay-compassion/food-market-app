import styled from '@emotion/styled';

import { adminTranslations } from '../../../adminLocales';
import type { GuestProfile } from '../../../models/guest-profile';
import { formatVisitDate } from '../../../services/visit-date';
import { ProfileCard } from './ProfileCard';

const Counts = styled.dl`
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 8px;
	margin: 0;

	div {
		display: flex;
		flex-direction: column-reverse;
		gap: 2px;
	}

	dt {
		color: var(--color-text-subtle);
		font-size: 12px;
	}

	dd {
		margin: 0;
		font-size: 18px;
		font-weight: 700;
	}
`;

/**
 * The household as the guest's latest visit recorded it — households are recorded per visit, never
 * on the guest — and, when it has changed, what it was before.
 */
export function HouseholdCard({ profile }: { profile: GuestProfile }) {
	const t = adminTranslations.en.guestProfile;
	const { household, previousHousehold } = profile;

	return (
		<ProfileCard aria-labelledby="guest-profile-household">
			<header>
				<h3 id="guest-profile-household">{t.householdTitle}</h3>
				{household ? (
					<p className="subtle">
						{t.householdAsOf.replace('{date}', formatVisitDate(household.asOf))}
					</p>
				) : null}
			</header>
			{household ? (
				<>
					<Counts>
						<div>
							<dt>{t.people}</dt>
							<dd>{household.size}</dd>
						</div>
						<div>
							<dt>{t.children}</dt>
							<dd>{household.children}</dd>
						</div>
						<div>
							<dt>{t.seniors}</dt>
							<dd>{household.seniors}</dd>
						</div>
					</Counts>
					{previousHousehold || household.ageRange ? (
						<p className="subtle">
							{[
								previousHousehold
									? t.householdWas
											.replace('{size}', String(previousHousehold.size))
											.replace('{date}', formatVisitDate(previousHousehold.asOf))
									: null,
								household.ageRange ? t.ageRange.replace('{range}', household.ageRange) : null,
							]
								.filter(Boolean)
								.join(' ')}
						</p>
					) : null}
				</>
			) : (
				<p className="subtle">{t.noHousehold}</p>
			)}
		</ProfileCard>
	);
}
