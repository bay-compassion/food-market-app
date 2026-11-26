import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { QueueActionsMenu } from './QueueActionsMenu';
import { SearchOpener } from './SearchOpener';
import { TicketOrderMenu } from './TicketOrderMenu';

const Toolbar = styled.div`
	display: flex;
	gap: 4px;
	align-items: center;
`;

/**
 * The top of the line inside the dashboard's Queue tab. The dashboard's own heading already names
 * the screen and the session's state, so all that is left of the standalone screen's header is
 * searching the line, the order to read it in, and the rarer actions.
 */
export const QueueToolbar = observer(function QueueToolbar() {
	const t = adminTranslations.en.queueDesk;

	return (
		<Toolbar className="queue-toolbar">
			<SearchOpener label={t.openSearch} />
			<TicketOrderMenu />
			<QueueActionsMenu embedded />
		</Toolbar>
	);
});
