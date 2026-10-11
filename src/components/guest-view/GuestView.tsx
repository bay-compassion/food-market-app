import { CircularProgress } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { Suspense, use, useState } from 'react';

import { RegistrationOpenState } from '@/components/guest-view/states/RegistrationOpenState.tsx';
import { visitTakesPrecedence } from '@/services/guest-visit-presentation.ts';
import { SessionStatusEnum } from '@/services/sessionStateMachine.ts';

import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { GuestLanguageHero } from './GuestLanguageHero';
import { GuestNotOpenState } from './GuestNotOpenState';
import { GuestRegistrationClosedState } from './GuestRegistrationClosedState';
import { GuestServiceState } from './GuestServiceState';
import { GuestStatusCard } from './GuestStatusCard';
import { GuestVisitState } from './GuestVisitState';
import { GuestIdentityCard } from './identity/GuestIdentityCard';

/** The guest home screen (`/`): identity, language, and whichever card the market status calls for. */
export const GuestView = observer(function GuestView() {
	const t = useTranslation();
	const { guest, session, visit } = useRootStore();

	const [status] = useState(() =>
		Promise.all([session.getStatus().catch(() => undefined), visit.refresh()]).then(
			() => undefined,
		),
	);

	return (
		<section className="guest-layout">
			{!guest.isReturningVisitor ? <GuestLanguageHero /> : null}

			{/* Named so it slides up into the introduction's place rather than cross-fading. */}
			<div className="guest-content">
				<Suspense
					fallback={
						<p className="status-loading" role="status">
							<CircularProgress size={24} aria-hidden="true" />
							{t.statusLoading}
						</p>
					}
				>
					<MarketStatus status={status} />
				</Suspense>
			</div>
		</section>
	);
});

const MarketStatus = observer(function MarketStatus({ status }: { status: Promise<void> }) {
	use(status);

	const { guest, session, visit } = useRootStore();

	/**
	 * An identified guest needs the card to establish whose lottery-only form is shown. When market
	 * status is unavailable or registration is not open, the card also gives an unidentified guest
	 * a route to save their information independently of a visit.
	 */
	const showIdentityCard =
		guest.isIdentified || session.currentStatus !== SessionStatusEnum.REGISTRATION_OPEN;

	const render = () => {
		if (!session.isActive) {
			return (
				<GuestStatusCard>
					<GuestNotOpenState />
				</GuestStatusCard>
			);
		}

		if (visitTakesPrecedence(session.currentStatus, visit.status)) {
			return <GuestVisitState />;
		}

		switch (session.currentStatus) {
			// If market retrieval failed, preserve the optimistic registration fallback. The server
			// remains authoritative and rejects the request if registration has actually closed.
			case null:
			case SessionStatusEnum.REGISTRATION_OPEN:
				return <RegistrationOpenState />;
			// Both closed phases reach this branch only when the guest has no visit — someone who
			// missed the window — so they read the same card.
			case SessionStatusEnum.REGISTRATION_CLOSED:
			case SessionStatusEnum.LOTTERY_PENDING:
				return (
					<GuestStatusCard>
						<GuestRegistrationClosedState />
					</GuestStatusCard>
				);
			case SessionStatusEnum.SERVICE_STARTED:
				return (
					<GuestStatusCard>
						<GuestServiceState />
					</GuestStatusCard>
				);
			default:
				return <GuestNotOpenState />;
		}
	};

	return (
		<>
			{showIdentityCard ? <GuestIdentityCard /> : null}
			{render()}
		</>
	);
});
