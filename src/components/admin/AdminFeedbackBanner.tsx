import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';

import { useRootStore } from '../../stores/react/store-context';

// The surface itself is the shared `.admin-feedback` rule in `AdminDashboardLayout`.
const Banner = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 8px 16px;
	align-items: center;
	justify-content: space-between;

	p {
		margin: 0;
	}
`;

/**
 * The way onto a guest's own phone, for a guest the worker has just added by hand. It stays until
 * the worker does something else; every other outcome is a toast (see `AdminStore.report`).
 */
export const AdminFeedbackBanner = observer(function AdminFeedbackBanner() {
	const { translations, admin } = useRootStore();
	const t = translations.adminTranslation;
	const claimable = admin.claimableGuest;
	const claimableGuestId = claimable?.guestId ?? null;
	const bannerRef = useRef<HTMLDivElement>(null);

	// The add button often sits at the foot of a long screen on a phone, while this banner sits at
	// the head of it — so bring the QR code offer to the worker rather than leave it off-screen.
	useEffect(() => {
		if (claimableGuestId) {
			bannerRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
		}
	}, [claimableGuestId]);

	if (!claimable) {
		return null;
	}

	return (
		<Banner ref={bannerRef} className="admin-feedback">
			<p role="status">{t.guestAdded.replace('{name}', claimable.name)}</p>
			<Button size="small" variant="outlined" onClick={() => void admin.showGuestClaim(claimable)}>
				{t.guestClaimShow}
			</Button>
		</Banner>
	);
});
