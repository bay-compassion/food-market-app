import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';

import { fetchPremarketStatus, premarketCodeFromHash } from '../../services/premarket';
import { PremarketEntryStore } from '../../stores/premarket-entry.store';
import { useRootStore } from '../../stores/react/store-context';
import { PremarketForm } from './PremarketForm';
import { PremarketStatusMessage } from './PremarketStatusMessage';

/**
 * `/premarket#<code>`: where the printed premarket QR lands on a volunteer's phone. The code rides
 * in the fragment so it never reaches a server log; this reads it once, then takes it out of the
 * address bar and history, as `/claim` does.
 *
 * Its own lazily loaded route: guests never come here, so none of it belongs in their download —
 * and nothing in the guest app links to it.
 */
export const PremarketPage = observer(function PremarketPage() {
	const location = useLocation();
	const navigate = useNavigate();
	const { registration, visit } = useRootStore();
	const [entry] = useState(
		() =>
			new PremarketEntryStore({
				code: premarketCodeFromHash(location.hash),
				registration,
				visit,
				checkStatus: fetchPremarketStatus,
			}),
	);

	useEffect(() => {
		void navigate({ hash: '' }, { replace: true });
		void entry.check();
	}, [entry, navigate]);

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
