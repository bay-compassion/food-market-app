import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';

import { fetchPremarketStatus } from '../../services/premarket';
import { PremarketEntryStore } from '../../stores/premarket-entry.store';
import { useRootStore } from '../../stores/react/store-context';
import { PremarketForm } from './PremarketForm';
import { PremarketStatusMessage } from './PremarketStatusMessage';

/**
 * `/premarket`: where the premarket QR code and link land on a volunteer's phone. The address is the
 * same every week; the server decides which session it joins.
 *
 * Its own lazily loaded route: guests never come here, so none of it belongs in their download —
 * and nothing in the guest app links to it.
 */
export const PremarketPage = observer(function PremarketPage() {
	const { guest, registration, visit } = useRootStore();
	const [entry] = useState(
		() =>
			new PremarketEntryStore({
				registration,
				visit,
				guest,
				checkStatus: fetchPremarketStatus,
			}),
	);

	useEffect(() => {
		void entry.check();
	}, [entry]);

	// Registered: the home screen shows the visit, as it would for any guest who just registered.
	if (entry.state === 'registered') {
		return <Navigate to="/" replace />;
	}

	return (
		<section className="guest-layout">
			{entry.state === 'open' ? (
				<PremarketForm entry={entry} />
			) : (
				<PremarketStatusMessage state={entry.state} onRetry={() => void entry.check()} />
			)}
		</section>
	);
});
