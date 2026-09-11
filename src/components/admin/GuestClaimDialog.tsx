import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { guestClaimUrl } from '../../services/guest-claim';
import { createQrCodeSvg } from '../../services/qrCode';
import { useRootStore } from '../../stores/react/store-context';
import { Dialog } from '../ui/Dialog';

// The dialog renders in a portal outside `.admin-dashboard`, so it carries its own styles.
const Body = styled.div`
	display: grid;
	gap: 18px;
	justify-items: center;
	text-align: center;

	p {
		margin: 0;
		color: var(--color-text-muted);
		line-height: 1.5;
	}

	.guest-claim-replaces {
		padding: 12px 14px;
		border-radius: var(--radius-sm);
		color: var(--color-text);
		background: var(--color-surface-soft);
		font-weight: 600;
		text-align: start;
	}

	.guest-claim-code {
		width: min(100%, 300px);
		padding: 16px;
		border: 2px solid var(--color-brand);
		border-radius: var(--radius-lg);
		background: white;
	}

	.guest-claim-code svg {
		display: block;
		width: 100%;
		height: auto;
	}
`;

/**
 * The QR code a guest scans to take their record onto their own phone. It is a single-use
 * credential, so it is shown only while the worker holds the dialog open — and when it will take
 * the record away from a phone the guest already uses, the dialog says so above the code.
 */
export const GuestClaimDialog = observer(function GuestClaimDialog() {
	const { translations, admin } = useRootStore();
	const t = translations.adminTranslation;
	const claim = admin.guestClaim;

	if (!claim) {
		return null;
	}

	const expiresAt = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(
		new Date(claim.expiresAt),
	);
	// Built from a URL this app composes around a server-issued token, never from user input.
	const qrSvg = createQrCodeSvg(guestClaimUrl(window.location.origin, claim.token));

	return (
		<Dialog
			open
			title={t.guestClaimTitle}
			closeLabel={t.guestClaimClose}
			onClose={() => admin.dismissGuestClaim()}
			actions={
				<Button type="button" onClick={() => admin.dismissGuestClaim()}>
					{t.guestClaimDone}
				</Button>
			}
		>
			<Body>
				{claim.replacesDevice ? (
					<p className="guest-claim-replaces" role="alert">
						{t.guestClaimReplacesDevice.replace('{name}', claim.guestName)}
					</p>
				) : null}
				<div
					className="guest-claim-code"
					role="img"
					aria-label={t.guestClaimImageAlt}
					dangerouslySetInnerHTML={{ __html: qrSvg }}
				/>
				<p>
					{t.guestClaimInstructions.replace('{name}', claim.guestName).replace('{time}', expiresAt)}
				</p>
			</Body>
		</Dialog>
	);
});
