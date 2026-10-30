import { GuestNextOpening } from './GuestNextOpening';
import { GuestNoVisitState } from './GuestNoVisitState';

/** The market is closed: when it next opens, and how a market Saturday runs. */
export function GuestNotOpenState() {
	return (
		<GuestNoVisitState>
			<GuestNextOpening />
		</GuestNoVisitState>
	);
}
