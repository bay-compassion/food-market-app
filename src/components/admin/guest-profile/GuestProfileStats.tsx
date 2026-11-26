import styled from '@emotion/styled';

import { adminTranslations } from '../../../adminLocales';
import type { GuestProfile } from '../../../models/guest-profile';

const Stats = styled.dl`
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 8px;
	margin: 0;

	div {
		display: flex;
		flex-direction: column-reverse;
		gap: 2px;
		padding: 10px;
		border-radius: var(--radius-sm);
		background: var(--color-surface-soft);
	}

	dt {
		color: var(--color-text-subtle);
		font-size: 12px;
	}

	dd {
		margin: 0;
		font-size: 20px;
		font-weight: 700;
	}
`;

/** The guest's record in four numbers: visits, served, no-shows, and their household's size. */
export function GuestProfileStats({ profile }: { profile: GuestProfile }) {
	const t = adminTranslations.en.guestProfile;
	const stats = [
		[t.visits, profile.visitCount],
		[t.served, profile.servedCount],
		[t.noShows, profile.noShowCount],
		[t.household, profile.household?.size ?? '—'],
	] as const;

	return (
		<Stats>
			{stats.map(([label, value]) => (
				<div key={label}>
					<dt>{label}</dt>
					<dd>{value}</dd>
				</div>
			))}
		</Stats>
	);
}
