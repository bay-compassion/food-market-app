import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';

import { adminFeedbackText } from '../../services/admin-feedback';
import { useRootStore } from '../../stores/react/store-context';
import { GuestClaimDialog } from './GuestClaimDialog';

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
 * The outcome of the worker's last action. A guest just added by hand also gets the way onto their
 * own phone from here, which stays available until the worker does something else.
 */
export const AdminFeedbackBanner = observer(function AdminFeedbackBanner() {
	const { translations, admin } = useRootStore();
	const t = translations.adminTranslation;
	const text = adminFeedbackText(admin.feedback, t);
	const claimableGuestId =
		admin.feedback?.kind === 'guest-added' && admin.feedback.offersPhoneClaim
			? admin.feedback.guestId
			: null;
	const bannerRef = useRef<HTMLDivElement>(null);

	// The add button often sits at the foot of a long screen on a phone, while this banner sits at
	// the head of it — so bring the QR code offer to the worker rather than leave it off-screen.
	useEffect(() => {
		if (claimableGuestId) {
			bannerRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
		}
	}, [claimableGuestId]);

	if (!text) {
		return null;
	}

	return (
		<Banner ref={bannerRef} className="admin-feedback">
			<p role="status">{text}</p>
			{claimableGuestId ? (
				<>
					<Button size="small" variant="outlined" onClick={() => void admin.showGuestClaim()}>
						{t.guestClaimShow}
					</Button>
					<GuestClaimDialog />
				</>
			) : null}
		</Banner>
	);
});
