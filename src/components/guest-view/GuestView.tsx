import { Card, CardContent, CircularProgress } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { Suspense, use, useEffect, useState } from 'react';

import { SessionStatusEnum } from '@/services/sessionStateMachine.ts';

import type { Locale } from '../../locales';
import { currentSessionPhase, resolveGuestCardState } from '../../services/guestCardState';
import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import type { Language } from '../../stores/translation.store';
import { RegistrationCountdown } from '../RegistrationCountdown';
import { GuestCombinedForm } from './forms/GuestCombinedForm';
import { GuestLanguageHero } from './GuestLanguageHero';
import { GuestNotOpenState } from './GuestNotOpenState';
import { GuestRegistrationClosedState } from './GuestRegistrationClosedState';
import { GuestServiceState } from './GuestServiceState';
import { GuestIdentityCard } from './identity/GuestIdentityCard';

/** The guest home screen (`/`): identity, language, and whichever card the session phase calls for. */
export const GuestView = observer(function GuestView() {
	const t = useTranslation();
	const rootStore = useRootStore();
	const { guest, session, visit, translations } = rootStore;

	const [status] = useState(() =>
		Promise.all([session.getStatus().catch(() => undefined), visit.refresh()]).then(
			() => undefined,
		),
	);
	/** Ticks every second so the session phase stays current. */
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 1_000);

		return () => clearInterval(timer);
	}, []);

	function selectLanguage(selected: Locale) {
		translations.setLanguage(selected as Language);
		guest.markAsReturningVisitor();
	}

	return (
		<section className="guest-layout">
			{!guest.isReturningVisitor ? <GuestLanguageHero onSelectLanguage={selectLanguage} /> : null}

			<Suspense
				fallback={
					<p className="status-loading" role="status">
						<CircularProgress size={24} aria-hidden="true" />
						{t.statusLoading}
					</p>
				}
			>
				<MarketStatus status={status} now={now} />
			</Suspense>
		</section>
	);
});

const MarketStatus = observer(function MarketStatus({
	status,
	now,
}: {
	status: Promise<void>;
	now: number;
}) {
	use(status);

	const { guest, session, visit } = useRootStore();

	/**
	 * If the optional configuration endpoint failed, keep registration available rather than
	 * blocking a guest behind a "not open" state the app could not actually confirm.
	 */
	const phase = session.currentState
		? currentSessionPhase(session.marketEvent, new Date(now))
		: 'registration-open';

	/**
	 * An active visit always wins — see `resolveGuestCardState` for the full precedence, which
	 * mirrors the server-side gate in `guestRegistration.mts`. The `/signup` route is the only place
	 * where `isPreregistration` applies.
	 */
	const cardState = resolveGuestCardState({
		phase,
		isIdentified: guest.isIdentified,
		isPreregistration: false,
		hasActiveVisit: visit.hasActiveVisit,
	});

	/**
	 * An identified guest needs the card to establish whose lottery-only form is shown. When market
	 * status is unavailable or registration is not open, the card also gives an unidentified guest
	 * a route to save their information independently of a visit.
	 */
	const showIdentityCard =
		guest.isIdentified || session.currentStatus !== SessionStatusEnum.REGISTRATION_OPEN;

	const render = () => {
		if (!session.isActive) {
			return <GuestNotOpenState />;
		}

		switch (session.currentStatus) {
			case SessionStatusEnum.REGISTRATION_OPEN:
				return (
					<>
						<RegistrationCountdown />
						<Card aria-live="polite">
							<CardContent>
								<GuestCombinedForm />
							</CardContent>
						</Card>
					</>
				);
			case SessionStatusEnum.REGISTRATION_CLOSED:
				return <GuestRegistrationClosedState />;
			case SessionStatusEnum.SERVICE_STARTED:
				return <GuestServiceState hasEnded={cardState.kind === 'ended'} />;
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
