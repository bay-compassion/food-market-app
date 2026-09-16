import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useState } from 'react';

import { everyPermission, isAuth0Configured, permissionsFromToken } from '../auth';
import type { ServiceProgress } from '../services/demoScenario';
import { manualAdmissionsFor } from '../services/guestAdmission';
import { currentSessionState, type SessionStatus } from '../services/sessionStateMachine';
import type { VisitCommand, VisitStatus } from '../services/visitStateMachine';
import { adminVisitStatusLabels } from '../services/visitStatusLabels';
import type { MarketAction } from '../stores/admin.store';
import { useRootStore } from '../stores/react/store-context';
import { AdminDashboardLayout } from './admin/AdminDashboardLayout';
import { DevModeView } from './admin/DevModeView';
import { GuestDatabaseView } from './admin/GuestDatabaseView';
import { MarketActionPrompts } from './admin/market-action-prompts';
import { QueueView } from './admin/QueueView';
import { ReportsView } from './admin/ReportsView';
import { SessionBroadcastForm } from './admin/SessionBroadcastForm';
import { SessionHistoryView } from './admin/SessionHistoryView';
import { SessionTab } from './admin/SessionTab';
import type { AdminView, ManualGuest, QueueGuest } from './admin/types';
import { PatternQuestionBank } from './schedule/PatternQuestionBank';
import { ScheduleView } from './schedule/ScheduleView';

export type AdminDashboardProps = {
	getAccessToken: () => Promise<string>;
	view?: AdminView;
	onNavigate: (view: AdminView) => void;
};

/** The admin area: navigation, the session's status, and whichever screen is selected. */
export const AdminDashboard = observer(function AdminDashboard({
	getAccessToken,
	view = 'current-session',
	onNavigate,
}: AdminDashboardProps) {
	const rootStore = useRootStore();
	const { translations, admin, session, confirmation } = rootStore;
	const t = translations.adminTranslation;
	const locale = translations.locale;

	const [activeView, setActiveView] = useState<AdminView>(view);
	const [broadcast, setBroadcast] = useState({ title: '', body: '' });

	useEffect(() => {
		rootStore.setAccessTokenProvider(getAccessToken);
		rootStore.setPermissionReader(async () =>
			isAuth0Configured ? permissionsFromToken(await getAccessToken()) : everyPermission(),
		);
	}, [getAccessToken, rootStore]);

	useEffect(() => {
		setActiveView(view);
	}, [view]);

	const navigate = useCallback(
		(next: AdminView) => {
			setActiveView(next);
			onNavigate(next);
		},
		[onNavigate],
	);

	const event = session.currentState?.event ?? null;
	const counts = session.currentState?.counts ?? {};
	const currentState = session.currentState;

	useEffect(() => {
		void (async () => {
			await admin.load();

			// The route can name a screen this worker cannot open — a shared link, or a role that
			// changed since they last bookmarked it. Land them on the first one they can.
			const allowed = admin.views;

			if (allowed.length > 0 && !allowed.includes(activeView)) {
				navigate(allowed[0]!);
			}
		})();
		// Deliberately once on mount: this is the initial load, not a reaction to the current view.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [admin]);

	const statusLabels: Record<VisitStatus, string> = adminVisitStatusLabels(locale);
	const sessionState = currentSessionState(event?.status);
	/**
	 * With no session configured a guest can still be added, with their details alone. Until the
	 * session has loaded, though, nothing is offered: "not known yet" is not "no session", and a form
	 * opened in that moment would start on details only and stay there once the session arrived.
	 */
	const sessionAdmissions = currentState ? manualAdmissionsFor(event?.status ?? null) : [];
	const currentSessionGuests = admin.sessionGuests
		.filter((guest) => guest.marketEventId === event?.id)
		.sort(
			(first, second) =>
				(first.queuePosition ?? Number.MAX_SAFE_INTEGER) -
				(second.queuePosition ?? Number.MAX_SAFE_INTEGER),
		);

	const outstandingCount = (counts.waiting ?? 0) + (counts.called ?? 0);
	const prompts = new MarketActionPrompts(t, outstandingCount);

	async function runMarketAction(action: MarketAction) {
		if (await confirmation.ask(prompts.for(action))) {
			await admin.runMarketAction(action);
		}
	}

	function runGuestCommand(guest: QueueGuest, command: VisitCommand) {
		return admin.runGuestCommand(guest, command);
	}

	function addManualGuest(guest: ManualGuest, marketEventId?: string | null) {
		return admin.addGuest(guest, { marketEventId, locale });
	}

	async function sendBroadcast() {
		const confirmed = await confirmation.ask({
			question: t.broadcastConfirm,
			confirmLabel: t.broadcastSend,
			dismissLabel: t.cancel,
		});

		if (!confirmed) {
			return;
		}

		if (await admin.sendBroadcast(broadcast)) {
			setBroadcast({ title: '', body: '' });
		}
	}

	async function loadScenario(stage: SessionStatus, serviceProgress?: ServiceProgress) {
		const confirmed = await confirmation.ask({
			question: t.devModeConfirm,
			details: [t.devModeConfirmDetails],
			confirmLabel: t.devModeLoad,
			dismissLabel: t.cancel,
			destructive: true,
		});

		if (confirmed) {
			await admin.loadDemoScenario(stage, serviceProgress);
		}
	}

	return (
		<AdminDashboardLayout activeView={activeView} onNavigate={navigate}>
			{activeView === 'current-session' ? (
				<SessionTab
					statusLabels={statusLabels}
					sessionGuests={currentSessionGuests}
					admissions={sessionAdmissions}
					onRun={(action) => void runMarketAction(action as MarketAction)}
					onAddGuest={(guest) => void addManualGuest(guest)}
					onNavigateQueue={() => navigate('queue')}
					onNavigateSchedule={() => navigate('schedule')}
				/>
			) : activeView === 'schedule' ? (
				<ScheduleView onNavigateSession={() => navigate('current-session')} />
			) : activeView === 'queue' ? (
				<QueueView
					guests={currentSessionGuests}
					counts={counts}
					statusLabels={statusLabels}
					serviceStarted={sessionState === 'service_started'}
					admissions={sessionAdmissions}
					busy={admin.isBusy}
					onCallNext={(count) => void admin.callNext(count)}
					onRun={(guest, command) => void runGuestCommand(guest, command)}
					onAddGuest={(guest) => void addManualGuest(guest)}
					onCloseSession={() => void runMarketAction('close_session')}
					onNavigateCurrentSession={() => navigate('current-session')}
				/>
			) : activeView === 'broadcast' ? (
				<SessionBroadcastForm
					broadcast={broadcast}
					onBroadcastChange={setBroadcast}
					onSend={() => void sendBroadcast()}
				/>
			) : activeView === 'question-bank' ? (
				<PatternQuestionBank />
			) : activeView === 'reports' ? (
				<ReportsView getAccessToken={getAccessToken} canExport={admin.can('export:guest-data')} />
			) : activeView === 'guest-database' ? (
				<GuestDatabaseView
					statusLabels={statusLabels}
					admissions={sessionAdmissions}
					onRun={(guest, command) => void runGuestCommand(guest, command)}
					onAddGuest={(guest) => void addManualGuest(guest)}
				/>
			) : activeView === 'dev-mode' ? (
				<DevModeView
					busy={admin.isBusy}
					onLoad={(stage, progress) => void loadScenario(stage, progress)}
				/>
			) : (
				<SessionHistoryView
					history={admin.history}
					busy={admin.isBusy}
					onAddGuest={(guest, marketEventId) => void addManualGuest(guest, marketEventId)}
				/>
			)}
		</AdminDashboardLayout>
	);
});
