import { CircularProgress } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { lazy, type ReactNode, Suspense, use, useEffect, useState } from 'react';

import { RegistrationOpenState } from '@/components/guest-view/states/RegistrationOpenState.tsx';
import { RegistrationCountdown } from '@/components/RegistrationCountdown.tsx';
import { visitTakesPrecedence } from '@/services/guest-visit-presentation.ts';
import { SessionStatusEnum } from '@/services/sessionStateMachine.ts';

import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { useGuestTourEnabled } from '../hooks/use-guest-tour-enabled';
import { GuestLanguageHero } from './GuestLanguageHero';
import { GuestNotOpenState } from './GuestNotOpenState';
import { GuestRegistrationClosedState } from './GuestRegistrationClosedState';
import { GuestServiceState } from './GuestServiceState';
import { GuestStatusCard } from './GuestStatusCard';
import { GuestVisitState } from './GuestVisitState';
import { GuestIdentityCard } from './identity/GuestIdentityCard';

const GuestTour = lazy(() => import('./tour/GuestTour'));

/** The guest home screen (`/`): identity, language, and whichever card the market status calls for. */
export const GuestView = observer(function GuestView() {
	const t = useTranslation();
	const { session, visit } = useRootStore();

	const [status] = useState(() =>
		Promise.all([session.getStatus().catch(() => undefined), visit.refresh()]).then(
			() => undefined,
		),
	);

	return (
		<GuestHome>
			<Suspense
				fallback={
					<p className="status-loading" role="status">
						<CircularProgress size={24} aria-hidden="true" />
						{t.statusLoading}
					</p>
				}
			>
				<LoadedMarketStatus status={status} />
			</Suspense>
		</GuestHome>
	);
});

/**
 * The home screen's layout around its market status: the first-visit introduction until a language
 * is chosen, then the content beneath it. Exported, with `GuestMarketStatus`, for a page that
 * supplies the stores' state itself rather than loading it — the presentations' guest phone.
 */
export const GuestHome = observer(function GuestHome({ children }: { children: ReactNode }) {
	const { guest, session, visit } = useRootStore();

	return (
		<>
			{/*
				Outside the layout's column so it runs the width of the screen under the app bar. A visit
				card shows its own clock, so this one is for the registration form alone.
			*/}
			{visitTakesPrecedence(session.currentStatus, visit.status) ? null : (
				<RegistrationCountdown pinned />
			)}
			<section className="guest-layout">
				{!guest.isReturningVisitor ? <GuestLanguageHero /> : null}

				{/* Named so it slides up into the introduction's place rather than cross-fading. */}
				<div className="guest-content">{children}</div>
			</section>
		</>
	);
});

function LoadedMarketStatus({ status }: { status: Promise<void> }) {
	use(status);

	return <GuestMarketStatus />;
}

/** Whichever cards the market status and the guest's visit call for, once both are known. */
export const GuestMarketStatus = observer(function GuestMarketStatus() {
	const rootStore = useRootStore();
	const { guest, session, tour, visit } = rootStore;
	const tourEnabled = useGuestTourEnabled();

	// Also re-run when the flag resolves on after LaunchDarkly loads, which may follow the first
	// render.
	useEffect(() => {
		if (tourEnabled) {
			rootStore.resumeTour();
		}
	}, [rootStore, tourEnabled]);

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
			{/* Mounted only once the market status is in, so the cards the tour points at are too. */}
			{tourEnabled && tour.isRunning ? (
				<Suspense fallback={null}>
					<GuestTour />
				</Suspense>
			) : null}
		</>
	);
});
