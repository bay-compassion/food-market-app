import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

import type { Locale } from '../../locales';
import {
	currentSessionPhase,
	guestFormContext,
	resolveGuestCardState,
} from '../../services/guestCardState';
import { SessionStatusEnum } from '../../services/sessionStateMachine';
import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import type { RegistrationSubmitResult } from '../../stores/registration.store';
import type { Language } from '../../stores/translation.store';
import { Card } from '../ui/layout/Card';
import { GuestIdentityIndicator } from './GuestIdentityIndicator';
import { GuestLanguageHero } from './GuestLanguageHero';
import { GuestNotOpenState } from './GuestNotOpenState';
import { GuestRegistrationClosedState } from './GuestRegistrationClosedState';
import { GuestRegistrationForm } from './GuestRegistrationForm';
import { GuestServiceState } from './GuestServiceState';
import { GuestVisitStatus } from './GuestVisitStatus';

/** The guest home screen (`/`): identity, language, and whichever card the session phase calls for. */
export const GuestView = observer(function GuestView() {
	const t = useTranslation();
	const rootStore = useRootStore();
	const { guest, session, visit, translations } = rootStore;

	const [isStatusLoading, setIsStatusLoading] = useState(true);
	/** Ticks every second so the registration form's countdown stays live. */
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 1_000);

		return () => clearInterval(timer);
	}, []);

	useEffect(() => {
		let cancelled = false;

		void Promise.all([session.getStatus().catch(() => undefined), visit.refresh()]).then(() => {
			if (!cancelled) {
				setIsStatusLoading(false);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [session, visit]);

	function selectLanguage(selected: Locale) {
		translations.setLanguage(selected as Language);
		guest.markAsReturningVisitor();
	}

	function handleSubmitted(result: RegistrationSubmitResult) {
		if (result.kind !== 'registered') {
			return;
		}

		visit.submit(result.registration);
	}

	function cancelVisit() {
		if (!window.confirm(t.cancelVisitConfirm)) {
			return;
		}

		void visit.cancel();
	}

	/**
	 * Whether `/api/market` has ever returned usable data. Stays `false` while it hasn't, including
	 * when the optional configuration endpoint can't be reached — the phase below treats that the
	 * same as registration being open, so the form is still available rather than blocking a guest
	 * behind a "not open" screen the app can't actually confirm.
	 */
	const hasLoadedRegistration = session.currentState !== null;
	const phase = hasLoadedRegistration
		? currentSessionPhase(session.marketEvent, new Date(now))
		: 'registration-open';
	/**
	 * Which of the signup card's states applies right now. An active visit always wins — see
	 * `resolveGuestCardState` for the full precedence, which mirrors the server-side gate in
	 * `guestRegistration.mts`. `isPreregistration` is always `false` here — the `/signup` route
	 * renders `SignupView` instead, which is the only place that flag ever applies.
	 */
	const cardState = resolveGuestCardState({
		phase,
		isIdentified: guest.isIdentified,
		isPreregistration: false,
		hasActiveVisit: visit.hasActiveVisit,
	});
	/**
	 * Once a market has run its course, there is nothing left to preregister for until an admin
	 * schedules the next one — unlike the "hasn't opened yet" case, which still welcomes it.
	 */
	const canPreregister = session.currentStatus !== SessionStatusEnum.ENDED;
	/** The success-state copy differs between joining today's queue and signing up ahead of time. */
	const successCopy =
		guestFormContext(phase) === 'early'
			? { title: t.earlySuccessTitle, description: t.earlySuccessDescription }
			: { title: t.successTitle, description: t.successDescription };

	return (
		<section className="guest-layout">
			{/* Card that indicates who the guest has been identified as */}
			{guest.identity ? <GuestIdentityIndicator identity={guest.identity} /> : null}

			{!guest.isReturningVisitor ? <GuestLanguageHero onSelectLanguage={selectLanguage} /> : null}

			{isStatusLoading ? (
				<p className="status-loading" aria-live="polite">
					{t.statusLoading}
				</p>
			) : (
				<Card aria-live="polite">
					{!session.isActive ? (
						<GuestNotOpenState allowPreregister={canPreregister} />
					) : cardState.kind === 'visit-status' ? (
						<GuestVisitStatus
							successTitle={successCopy.title}
							successDescription={successCopy.description}
							onCancelVisit={cancelVisit}
						/>
					) : cardState.kind === 'form' ? (
						<GuestRegistrationForm
							context={cardState.context}
							now={now}
							onSubmitted={handleSubmitted}
						/>
					) : cardState.kind === 'not-open' ? (
						<GuestNotOpenState />
					) : cardState.kind === 'registration-closed' ? (
						<GuestRegistrationClosedState />
					) : (
						<GuestServiceState hasEnded={cardState.kind === 'ended'} />
					)}
				</Card>
			)}
		</section>
	);
});
