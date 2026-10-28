import styled from '@emotion/styled';
import { Card } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { Dialog } from '../../ui/Dialog';
import { GuestIdentityMenu } from './GuestIdentityMenu';
import { IdentityNotificationStatus } from './IdentityNotificationStatus';
import { NotificationOptIn } from './NotificationOptIn';

const IdentityCard = styled(Card)`
	display: flex;
	flex-direction: column;
	margin-bottom: 16px;
	padding: 14px 16px;
	border-radius: var(--radius-md);
	color: var(--color-brand-dark);
	background: var(--color-surface-soft);

	& > .identity-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 12px;

		svg {
			flex: 0 0 auto;
			width: 28px;
			height: 28px;
			color: var(--color-success);
		}

		.identity-container {
			display: grid;
			flex: 1;
			grid-template-columns: repeat(2, 1fr);
			grid-template-areas:
				'heading heading'
				'name phone'
				'notifications notifications';
		}

		.identity-heading {
			grid-area: heading;
		}

		.identity-name {
			grid-area: name;
		}

		.identity-phone {
			grid-area: phone;
		}
	}

	.notification-status {
		grid-area: notifications;
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid var(--color-divider);
	}

	.notification-status .app-button {
		width: 100%;
	}

	.notification-loading,
	.notification-error {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 14px;
		line-height: 1.45;
	}

	.notification-loading {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.notification-error {
		color: var(--color-error);
	}

	.identity-heading {
		margin-bottom: 2px;
		color: var(--color-text-muted);
		font-size: 13px;
		font-weight: 600;
	}

	.identity-name {
		font-weight: 700;
	}

	.identity-phone {
		margin-top: 2px;
		color: var(--color-text-muted);
		font-size: 14px;
	}

	.notifications-enabled {
		display: flex;
		align-items: center;
		gap: 7px;
		margin: 0;
		color: var(--color-success);
		font-size: 13px;
		font-weight: 700;
	}

	.notifications-enabled svg {
		width: 18px;
		height: 18px;
		stroke-width: 2.5;
	}
`;

/** The identity saved on this phone, shown only after a guest has been added. */
export const GuestIdentityCard = observer(function GuestIdentityCard() {
	const { guest } = useRootStore();

	return guest.isIdentified ? <IdentifiedGuestIdentity /> : null;
});

const IdentifiedGuestIdentity = observer(function IdentifiedGuestIdentity() {
	const t = useTranslation();
	const { guest } = useRootStore();
	const { identity } = guest;
	const [notificationsDialogOpen, setNotificationsDialogOpen] = useState(false);
	const [notificationSettings] = useState(() => guest.loadNotificationSettings());
	const copy = t.guestView.identityIndicator;

	// Consent granted anywhere — including from inside the dialog — is the signal that the dialog
	// has done its job and should close.
	useEffect(() => {
		if (guest.smsConsented) {
			setNotificationsDialogOpen(false);
		}
	}, [guest.smsConsented]);

	if (!identity) {
		return null;
	}

	return (
		<>
			<IdentityCard role="complementary" className="guest-identity" aria-label={copy.heading}>
				<div className="identity-row">
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<path d="M20 21a8 8 0 0 0-16 0" />
						<circle cx="12" cy="7" r="4" />
						<path d="m16.5 14.5 1.5 1.5 3-3" />
					</svg>
					<div className="identity-container">
						<div className="identity-heading">{copy.heading}</div>
						<div className="identity-name" data-sentry-mask>
							<bdi dir="auto">{guest.displayedName}</bdi>
						</div>
						<div className="identity-phone" data-sentry-mask>
							<bdi dir="ltr">{identity.phone}</bdi>
						</div>
					</div>
					<GuestIdentityMenu />
				</div>

				<IdentityNotificationStatus
					loadSettings={notificationSettings}
					onOpenDialog={() => setNotificationsDialogOpen(true)}
				/>
			</IdentityCard>

			<Dialog
				open={notificationsDialogOpen}
				title={copy.notificationsDialogTitle}
				closeLabel={copy.closeNotificationsDialog}
				onClose={() => setNotificationsDialogOpen(false)}
			>
				<NotificationOptIn />
			</Dialog>
		</>
	);
});
