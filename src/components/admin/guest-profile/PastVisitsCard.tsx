import styled from '@emotion/styled';

import { adminTranslations } from '../../../adminLocales';
import type { GuestProfileVisit } from '../../../models/guest-profile';
import { QueueNumber } from '../../../models/queue-number';
import { formatVisitDate } from '../../../services/visit-date';
import { ProfileCard } from './ProfileCard';
import { VisitStatusChip } from './VisitStatusChip';

const List = styled.ol`
	display: grid;
	margin: 0;
	padding: 0;
	list-style: none;

	li {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 0;
		border-top: 1px solid var(--color-divider);
	}

	.when {
		display: grid;
		flex: 1;
		gap: 2px;
		min-width: 0;
	}

	strong {
		font-size: 15px;
	}

	span.detail {
		color: var(--color-text-subtle);
		font-size: 13px;
	}
`;

/** What one visit was, in a line: its number or track, who made it, and the household it recorded. */
function visitDetail(visit: GuestProfileVisit): string {
	const t = adminTranslations.en.guestProfile;
	const number = QueueNumber.of(visit);

	return [
		visit.track === 'premarket'
			? t.premarket
			: number
				? t.visitNumber.replace('{number}', number.label)
				: null,
		visit.source === 'admin' ? t.addedByStaff : null,
		`${t.household} ${visit.householdSize}`,
	]
		.filter(Boolean)
		.join(' · ');
}

/** The guest's visits before today's, newest first, each with how it ended. */
export function PastVisitsCard({ visits }: { visits: GuestProfileVisit[] }) {
	const t = adminTranslations.en.guestProfile;

	return (
		<ProfileCard aria-labelledby="guest-profile-past-visits">
			<header>
				<h3 id="guest-profile-past-visits">{t.recentTitle}</h3>
			</header>
			{visits.length === 0 ? (
				<p className="subtle">{t.noPastVisits}</p>
			) : (
				<List>
					{visits.map((visit) => (
						<li key={visit.id}>
							<span className="when">
								<strong>{formatVisitDate(visit.visitDate)}</strong>
								<span className="detail">{visitDetail(visit)}</span>
							</span>
							<VisitStatusChip status={visit.status} />
						</li>
					))}
				</List>
			)}
		</ProfileCard>
	);
}
