import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';

import { adminTranslations } from '../../../adminLocales';
import type { RelatedGuestRecord } from '../../../models/guest-profile';
import { useRootStore } from '../../../stores/react/store-context';
import { ProfileCard } from './ProfileCard';

const List = styled.ul`
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

	.who {
		display: grid;
		flex: 1;
		gap: 2px;
		min-width: 0;
	}

	.relation {
		color: var(--color-brand-dark);
		font-size: 12px;
		font-weight: 700;
	}

	.detail {
		color: var(--color-text-subtle);
		font-size: 13px;
	}
`;

function relatedDetail(record: RelatedGuestRecord): string {
	const t = adminTranslations.en;
	const created = new Date(record.createdAt).toLocaleDateString('en-US', {
		month: 'short',
		year: 'numeric',
	});
	const visits =
		record.visitCount === 1
			? t.visitCountOne
			: t.visitCount.replace('{count}', String(record.visitCount));

	return [
		t.guestProfile.relatedDetail.replace('{created}', created).replace('{visits}', visits),
		record.phone,
	].join(' · ');
}

/**
 * The other records linked to this guest: likely the same person — one person routinely holds
 * several, since a visit a worker adds always makes a new one — and the rest of their household.
 * Each opens its own profile. Merging records is not offered.
 */
export const RelatedRecordsCard = observer(function RelatedRecordsCard({
	onOpenGuest,
}: {
	onOpenGuest: (guestId: string) => void;
}) {
	const t = adminTranslations.en.guestProfile;
	const store = useRootStore().admin.guestProfile;
	const related = store.related;

	useEffect(() => {
		void store.loadRelated();
	}, [store, store.guestId]);

	return (
		<ProfileCard aria-labelledby="guest-profile-related">
			<header>
				<h3 id="guest-profile-related">{t.sameTitle}</h3>
			</header>
			<p className="subtle">{t.sameHelp}</p>
			{store.relatedFailed ? (
				<p className="subtle" role="alert">
					{t.relatedFailed}
				</p>
			) : related === null ? (
				<p className="subtle" role="status">
					{t.relatedLoading}
				</p>
			) : related.length === 0 ? (
				<p className="subtle">{t.noRelated}</p>
			) : (
				<List aria-labelledby="guest-profile-related">
					{related.map((record) => (
						<li key={record.guestId}>
							<span className="who">
								<span className="relation">
									{record.relation === 'same-person' ? t.samePerson : t.sameHousehold}
								</span>
								<strong>{`${record.firstName} ${record.lastName}`.trim()}</strong>
								<span className="detail">{relatedDetail(record)}</span>
							</span>
							<Button size="small" onClick={() => onOpenGuest(record.guestId)}>
								{t.openRecord}
							</Button>
						</li>
					))}
				</List>
			)}
		</ProfileCard>
	);
});
