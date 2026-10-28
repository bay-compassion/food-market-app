import { Alert, Button, CircularProgress } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { Component, type ReactNode, Suspense, use } from 'react';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';

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

	if (!guest.smsConfigured && !guest.smsConsented && !guest.smsOptOutSender) {
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
				<Button className="app-button" data-tour="text-updates" onClick={onOpenDialog}>
					{copy.notificationsAction}
				</Button>
			)}
		</div>
	);
});

/** Isolates notification loading failures from the guest’s saved identity. */
export function IdentityNotificationStatus({
	loadSettings,
	onOpenDialog,
}: NotificationStatusProps) {
	const copy = useTranslation().guestView.identityIndicator;

	return (
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
				<NotificationStatus loadSettings={loadSettings} onOpenDialog={onOpenDialog} />
			</Suspense>
		</NotificationStatusErrorBoundary>
	);
}
