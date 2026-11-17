import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';
import { languages } from '../../locales';
import type { QueueGuest } from '../../services/admin-api';

const Facts = styled.p`
	display: flex;
	flex-wrap: wrap;
	gap: 4px 16px;
	margin: 0;
	color: var(--color-text-muted);
	font-size: 15px;
`;

/** What a volunteer reads off an open ticket at a glance: the household's size and language. */
export function TicketFacts({ guest }: { guest: QueueGuest }) {
	const t = adminTranslations.en.queueDesk;
	const language = languages.find(({ code }) => code === guest.locale)?.englishLabel;

	return (
		<Facts className="guest-details">
			<span>{t.household.replace('{count}', String(guest.householdSize))}</span>
			{language ? <span>{language}</span> : null}
		</Facts>
	);
}
