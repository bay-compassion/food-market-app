import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';

import { pullStandbyTicket, standbyCodeFrom } from '../../services/standby';
import { useRootStore } from '../../stores/react/store-context';
import { StandbyEntryStore } from '../../stores/standby-entry.store';
import { StandbyForm } from './StandbyForm';
import { StandbyStatusMessage } from './StandbyStatusMessage';

/**
 * `/standby#<code>`: where the standby iPads' QR code lands on a guest's phone at the market. It
 * pulls a ticket at once — the guest's place is held from the moment they scan — and then asks for
 * their details.
 *
 * Its own lazily loaded route, and nothing in the guest app links to it: standby is never
 * advertised, so only someone who scanned the code at the market reaches it.
 */
export const StandbyPage = observer(function StandbyPage() {
	const { guest, registration, visit } = useRootStore();
	const { hash } = useLocation();
	const code = standbyCodeFrom(hash);
	const [entry] = useState(
		() =>
			new StandbyEntryStore({
				registration,
				visit,
				guest,
				pullTicket: pullStandbyTicket,
				storage: window.localStorage,
			}),
	);

	useEffect(() => {
		void entry.start(code);
	}, [entry, code]);

	// Joined: the home screen shows the standby card, as it would for any guest with a visit.
	if (entry.state === 'joined') {
		return <Navigate to="/" replace />;
	}

	return (
		<section className="guest-layout">
			{entry.state === 'held' ? (
				<StandbyForm entry={entry} />
			) : (
				<StandbyStatusMessage state={entry.state} onRetry={() => void entry.start(code)} />
			)}
		</section>
	);
});
