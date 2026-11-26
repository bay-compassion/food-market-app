import styled from '@emotion/styled';

import { adminTranslations } from '../../../adminLocales';
import { languageLabel } from '../../../models/guest-database-rows';
import type { GuestProfile } from '../../../models/guest-profile';
import { BackButton } from '../BackButton';

const Header = styled.header`
	display: grid;
	gap: 14px;

	.who {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.initials {
		display: grid;
		flex-shrink: 0;
		place-items: center;
		width: 56px;
		height: 56px;
		border-radius: var(--radius-pill);
		background: var(--color-surface-soft);
		color: var(--color-brand-dark);
		font-size: 20px;
		font-weight: 700;
	}

	h2 {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 26px;
		line-height: 1.1;
	}

	.says {
		margin: 2px 0 0;
		color: var(--color-text-muted);
		font-size: 14px;
	}

	.facts {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 16px;
		margin: 0;
		color: var(--color-text-muted);
		font-size: 14px;
	}

	.facts a {
		display: inline-flex;
		align-items: center;
		min-height: 32px;
		color: var(--color-brand);
		font-weight: 700;
		text-decoration: none;
	}
`;

/** Who the guest is: their name and how to say it, how to reach them, and how long they've come. */
export function GuestProfileHeader({
	profile,
	onBack,
}: {
	profile: GuestProfile;
	/** The way back to the list; the desk's side panel, which sits beside the list, has none. */
	onBack?: () => void;
}) {
	const t = adminTranslations.en.guestProfile;
	const since = profile.createdAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

	return (
		<Header>
			{onBack ? <BackButton label={t.back} onClick={onBack} /> : null}
			<div className="who">
				<span className="initials" aria-hidden="true">
					{profile.initials}
				</span>
				<div>
					<h2>{profile.name}</h2>
					{profile.pronunciation ? (
						<p className="says">{t.saysIt.replace('{pronunciation}', profile.pronunciation)}</p>
					) : null}
				</div>
			</div>
			<p className="facts">
				<a href={`tel:${profile.phone.replace(/[^\d+]/g, '')}`}>{profile.phone}</a>
				<span>{languageLabel(profile.locale)}</span>
				<span>{t.onRecordSince.replace('{date}', since)}</span>
			</p>
		</Header>
	);
}
