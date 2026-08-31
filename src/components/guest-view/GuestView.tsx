import { Card, CardContent, CircularProgress } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { Suspense, use, useState } from 'react';

import { RegistrationOpenState } from '@/components/guest-view/states/RegistrationOpenState.tsx';
import { visitTakesPrecedence } from '@/services/guest-visit-presentation.ts';
import { SessionStatusEnum } from '@/services/sessionStateMachine.ts';

import type { Locale } from '../../locales';
import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import type { Language } from '../../stores/translation.store';
import { GuestLanguageHero } from './GuestLanguageHero';
import { GuestNotOpenState } from './GuestNotOpenState';
import { GuestRegistrationClosedState } from './GuestRegistrationClosedState';
import { GuestServiceState } from './GuestServiceState';
import { GuestVisitState } from './GuestVisitState';
import { GuestIdentityCard } from './identity/GuestIdentityCard';

/** The guest home screen (`/`): identity, language, and whichever card the market status calls for. */
export const GuestView = observer(function GuestView() {
	const t = useTranslation();
	const rootStore = useRootStore();
	const { guest, session, visit, translations } = rootStore;

	const [status] = useState(() =>
		Promise.all([session.getStatus().catch(() => undefined), visit.refresh()]).then(
			() => undefined,
		),
	);

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
				<MarketStatus status={status} />
			</Suspense>
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
				<Card aria-live="polite">
					<CardContent>
						<GuestNotOpenState />
					</CardContent>
				</Card>
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
			case SessionStatusEnum.REGISTRATION_CLOSED:
			case SessionStatusEnum.LOTTERY_PENDING:
				return (
					<Card aria-live="polite">
						<CardContent>
							<GuestRegistrationClosedState />
						</CardContent>
					</Card>
				);
			case SessionStatusEnum.SERVICE_STARTED:
				return (
					<Card aria-live="polite">
						<CardContent>
							<GuestServiceState />
						</CardContent>
					</Card>
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
