import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { claimTokenFromHash } from '../../services/guest-claim';
import { GuestClaimCard } from '../guest-view/identity/GuestClaimCard';

/**
 * `/claim#<code>`: where a worker's QR code lands. The code rides in the fragment so it never
 * reaches a server log; this reads it once and then takes it out of the address bar and history.
 */
export function ClaimView() {
	const location = useLocation();
	const navigate = useNavigate();
	const [token] = useState(() => claimTokenFromHash(location.hash));

	useEffect(() => {
		void navigate({ hash: '' }, { replace: true });
	}, [navigate]);

	return (
		<section className="guest-layout">
			<GuestClaimCard token={token} />
		</section>
	);
}
