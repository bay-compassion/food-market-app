import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { useQueueDesk } from './queue-desk-context';
import { TicketDetails } from './TicketDetails';

const Pane = styled.aside`
	box-sizing: border-box;
	min-height: 0;
	padding: 16px 20px;
	overflow-y: auto;
	border: 1px solid var(--color-border);
	border-radius: var(--radius-lg);
	background: var(--color-background);

	.empty {
		margin: 0;
		padding: 24px 0;
		color: var(--color-text-subtle);
		font-size: 17px;
		text-align: center;
	}
`;

/**
 * The open ticket on a desk-sized screen: always in view beside the line, rather than a sheet
 * over it, so the volunteer at the check-in desk sees the line and the guest in front of them at
 * once.
 */
export const TicketPane = observer(function TicketPane() {
	const t = adminTranslations.en.queueDesk;
	const guest = useQueueDesk().selected;

	return (
		<Pane aria-label={t.ticket}>
			{guest ? <TicketDetails guest={guest} /> : <p className="empty">{t.noTicketOpen}</p>}
		</Pane>
	);
});
