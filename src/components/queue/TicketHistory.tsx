import { observer } from 'mobx-react-lite';

import { useTicketList } from './ticket-list-context';
import { VisitTimeline } from './VisitTimeline';

/**
 * The open ticket's visit history. Nothing is drawn until the history has loaded, so the sheet
 * does not flash an empty state.
 */
export const TicketHistory = observer(function TicketHistory() {
	const { history } = useTicketList();

	return history === null ? null : <VisitTimeline events={history} />;
});
