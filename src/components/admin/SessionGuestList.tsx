import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { languages, type Locale } from '../../locales';
import { useTranslation } from '../../stores/react/use-translation';
import type { QueueGuest } from './types';

export type SessionGuestListProps = {
	guests: QueueGuest[];
};

const Section = styled.section`
	.session-count {
		display: grid;
		place-items: center;
		min-width: 38px;
		height: 38px;
		padding: 0 10px;
		border-radius: var(--radius-pill);
		color: var(--color-on-brand);
		background: var(--color-brand);
		font-family: var(--font-heading);
		font-weight: 700;
	}
`;

/** Everyone registered for the session, before the lottery has decided anything. */
export const SessionGuestList = observer(function SessionGuestList({
	guests,
}: SessionGuestListProps) {
	const t = adminTranslations.en;
	const base = useTranslation();

	function guestLanguageLabel(locale: Locale) {
		return languages.find((language) => language.code === locale)?.label ?? locale;
	}

	return (
		<Section className="admin-section guest-section registered-section">
			<div className="section-heading">
				<h2>{t.registeredGuests}</h2>
				<span className="session-count">{guests.length}</span>
			</div>
			{guests.length ? (
				<div className="guest-list">
					{guests.map((guest) => (
						<article key={guest.id} className="guest-row">
							<div>
								<strong>
									{guest.firstName} {guest.lastName}
								</strong>
								<span>
									{guest.phone} · {base.household}: {guest.householdSize}
								</span>
								<span>
									{base.language}: {guestLanguageLabel(guest.locale)}
								</span>
							</div>
						</article>
					))}
				</div>
			) : (
				<p className="empty-state">{t.noRegisteredGuests}</p>
			)}
		</Section>
	);
});
