import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

import type { GuestIdentity } from '../../stores/guest.store';
import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { AppButton } from '../AppButton';
import { Dialog } from '../ui/Dialog';
import { NotificationOptIn } from './NotificationOptIn';

export type GuestIdentityIndicatorProps = {
	identity: GuestIdentity;
};

const Identity = styled.aside`
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
		border-top: 1px solid rgb(2 57 64 / 18%);
	}

	.notification-status .app-button {
		width: 100%;
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

/**
 * "We recognise this device": the name and phone saved in this browser, and the SMS opt-in.
 *
 * It shows only what local storage holds and never retrieves a guest profile from the server, so
 * a device with a token but no cached profile shows nothing at all.
 */
export const GuestIdentityIndicator = observer(function GuestIdentityIndicator({
	identity,
}: GuestIdentityIndicatorProps) {
	const t = useTranslation();
	const { guest } = useRootStore();
	const [notificationsDialogOpen, setNotificationsDialogOpen] = useState(false);
	const copy = t.guestView.identityIndicator;
	const lastInitial = identity.lastName.charAt(0);

	useEffect(() => {
		void guest.loadNotificationSettings();
	}, [guest]);

	// Consent granted anywhere — including from inside the dialog — is the signal that the dialog
	// has done its job and should close.
	useEffect(() => {
		if (guest.smsConsented) {
			setNotificationsDialogOpen(false);
		}
	}, [guest.smsConsented]);

	return (
		<>
			<Identity className="guest-identity" aria-label={copy.heading}>
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
						<div className="identity-name">
							<bdi dir="auto">
								{identity.firstName} {lastInitial}
							</bdi>
						</div>
						<div className="identity-phone">
							<bdi dir="ltr">{identity.phone}</bdi>
						</div>
					</div>
				</div>

				{guest.notificationSettingsLoaded ? (
					<div className="notification-status">
						{guest.smsConsented ? (
							<p className="notifications-enabled" aria-live="polite">
								<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
									<path d="m5 12 4 4L19 6" />
								</svg>
								{copy.notificationsEnabled}
							</p>
						) : guest.smsConfigured ? (
							<AppButton
								type="button"
								variant="secondary"
								onClick={() => setNotificationsDialogOpen(true)}
								label={copy.notificationsAction}
							/>
						) : null}
					</div>
				) : null}
			</Identity>

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
