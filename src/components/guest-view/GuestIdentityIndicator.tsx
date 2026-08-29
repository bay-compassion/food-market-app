import styled from '@emotion/styled';
import { Alert, Button, Card, CircularProgress } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { Component, Suspense, use, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { Dialog } from '../ui/Dialog';
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
		border-top: 1px solid rgb(2 57 64 / 18%);
	}

	.notification-status .app-button {
		width: 100%;
	}

	&.guest-identity-unidentified {
		gap: 12px;
	}

	.unidentified-message,
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

type NotificationStatusErrorBoundaryProps = {
	children: ReactNode;
	fallback: string;
};

class NotificationStatusErrorBoundary extends Component<
	NotificationStatusErrorBoundaryProps,
	{ failed: boolean }
> {
	override state = { failed: false };

	static getDerivedStateFromError() {
		return { failed: true };
	}

	override render() {
		if (this.state.failed) {
			return (
				<div className="notification-status">
					<Alert severity="error" variant="standard" className="notification-error">
						{this.props.fallback}
					</Alert>
				</div>
			);
		}

		return this.props.children;
	}
}

type NotificationStatusProps = {
	loadSettings: Promise<void>;
	onOpenDialog: () => void;
};

const NotificationStatus = observer(function NotificationStatus({
	loadSettings,
	onOpenDialog,
}: NotificationStatusProps) {
	use(loadSettings);

	const t = useTranslation();
	const { guest } = useRootStore();
	const copy = t.guestView.identityIndicator;

	if (!guest.smsConfigured && !guest.smsConsented) {
		return null;
	}

	return (
		<div className="notification-status">
			{guest.smsConsented ? (
				<p className="notifications-enabled" aria-live="polite">
					<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path d="m5 12 4 4L19 6" />
					</svg>
					{copy.notificationsEnabled}
				</p>
			) : (
				<Button className="app-button" onClick={onOpenDialog}>
					{copy.notificationsAction}
				</Button>
			)}
		</div>
	);
});

/**
 * "We recognise this device": the name and phone saved in this browser, and the SMS opt-in.
 *
 * It shows only what local storage holds and never retrieves a guest profile from the server. A
 * device without a complete cached identity instead gets a direct path to preregistration.
 */
export const GuestIdentityIndicator = observer(function GuestIdentityIndicator() {
	const t = useTranslation();
	const { guest } = useRootStore();
	const { identity } = guest;
	const copy = t.guestView.identityIndicator;
	const navigate = useNavigate();

	if (!guest.isIdentified) {
		return (
			<IdentityCard
				role="complementary"
				className="guest-identity guest-identity-unidentified"
				aria-label={copy.unidentifiedHeading}
			>
				<div>
					<div className="identity-heading">{copy.unidentifiedHeading}</div>
					<p className="unidentified-message">{copy.unidentifiedMessage}</p>
				</div>
				<Button onClick={() => void navigate('/signup')}>{copy.preregisterAction}</Button>
			</IdentityCard>
		);
	}

	if (!identity) {
		return null;
	}

	return <IdentifiedGuestIdentity />;
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
						<div className="identity-name">
							<bdi dir="auto">{guest.displayedName}</bdi>
						</div>
						<div className="identity-phone">
							<bdi dir="ltr">{identity.phone}</bdi>
						</div>
					</div>
				</div>

				<NotificationStatusErrorBoundary fallback={copy.notificationsError}>
					<Suspense
						fallback={
							<div className="notification-status">
								<p className="notification-loading" role="status">
									<CircularProgress size={18} aria-hidden="true" />
									{copy.notificationsLoading}
								</p>
							</div>
						}
					>
						<NotificationStatus
							loadSettings={notificationSettings}
							onOpenDialog={() => setNotificationsDialogOpen(true)}
						/>
					</Suspense>
				</NotificationStatusErrorBoundary>
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
