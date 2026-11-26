import { ListItemIcon, MenuItem } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { TicketOrder } from '../../models/ticket-order';
import { OverflowMenu } from '../admin/OverflowMenu';
import { useTicketList } from './ticket-list-context';

function SortIcon() {
	return (
		<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none">
			<path
				d="M3 5h14M5 10h10M8 15h4"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	);
}

function CheckIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true" fill="none">
			<path
				d="M3 8.5l3 3 7-7"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

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
		<OverflowMenu
			label={t.sortLabel.replace('{order}', t.orders[order.key])}
			icon={<SortIcon />}
			active={!order.isQueueOrder}
		>
			{(closeMenu) =>
				TicketOrder.keys.map((key) => (
					<MenuItem
						key={key}
						role="menuitemradio"
						aria-checked={order.key === key}
						selected={order.key === key}
						onClick={() => {
							list.setOrder(key);
							closeMenu();
						}}
					>
						<ListItemIcon>{order.key === key ? <CheckIcon /> : null}</ListItemIcon>
						{t.orders[key]}
					</MenuItem>
				))
			}
		</OverflowMenu>
	);
});
