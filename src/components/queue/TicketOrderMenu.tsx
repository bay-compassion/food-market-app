import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { TicketOrder } from '../../models/ticket-order';
import { SortMenu } from '../admin/SortMenu';
import { useTicketList } from './ticket-list-context';

/**
 * Which order a ticket list's sections are read in: the queue's own, or by first or last name. The
 * queue's waiting list stays in line order whichever is chosen. The button fills in while the lists
 * are sorted by name, so nobody reads a section's order as the queue's.
 */
export const TicketOrderMenu = observer(function TicketOrderMenu() {
	const t = adminTranslations.en.queueDesk;
	const list = useTicketList();
	const { order } = list;

	return (
		<SortMenu
			label={t.sortLabel.replace('{order}', t.orders[order.key])}
			keys={TicketOrder.keys}
			labels={t.orders}
			value={order.key}
			active={!order.isQueueOrder}
			onChange={(key) => list.setOrder(key)}
		/>
	);
});
