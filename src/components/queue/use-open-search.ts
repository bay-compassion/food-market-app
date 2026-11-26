import { useCallback } from 'react';
import { flushSync } from 'react-dom';

import { useTicketList } from './ticket-list-context';

/**
 * Opens the ticket search so that its field takes focus within the tap that opened it. iOS Safari
 * raises the keyboard only for focus given during the gesture itself, and a dialog rendered on
 * React's usual schedule mounts just after it, leaving the field focused but the keyboard down.
 */
export function useOpenSearch(): () => void {
	const list = useTicketList();

	return useCallback(() => flushSync(() => list.openSearch()), [list]);
}
