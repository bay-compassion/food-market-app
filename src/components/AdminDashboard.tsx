import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';

import { everyPermission, isAuth0Configured, permissionsFromToken } from '../auth';
import { LineOrder } from '../models/line-order';
import type { ServiceProgress } from '../services/demoScenario';
import { manualAdmissionsFor } from '../services/guestAdmission';
import type { SessionStatus } from '../services/sessionStateMachine';
import type { VisitCommand, VisitStatus } from '../services/visitStateMachine';
import { adminVisitStatusLabels } from '../services/visitStatusLabels';
import type { MarketAction } from '../stores/admin.store';
import { useRootStore } from '../stores/react/store-context';
import { AdminDashboardLayout } from './admin/AdminDashboardLayout';
import { ChecklistView } from './admin/ChecklistView';
import { DevModeView } from './admin/DevModeView';
import { GuestDatabaseView } from './admin/GuestDatabaseView';
import { MarketActionPrompts } from './admin/market-action-prompts';
import { QueueView } from './admin/QueueView';
import { ReportsView } from './admin/ReportsView';
import { SessionBroadcastForm } from './admin/SessionBroadcastForm';
import { SessionHistoryView } from './admin/SessionHistoryView';
import { SessionView } from './admin/SessionView';
import type { AdminView, ManualGuest, QueueGuest } from './admin/types';
import { WorkersView } from './admin/WorkersView';
import { PatternQuestionBank } from './schedule/PatternQuestionBank';
import { ScheduleView } from './schedule/ScheduleView';

export type AdminDashboardProps = {
	getAccessToken: () => Promise<string>;
	/** The screen the route names. Without one, the dashboard picks where to land. */
	view?: AdminView;
	onNavigate: (view: AdminView) => void;
};

/** The admin area: navigation, the session's status, and whichever screen is selected. */
export const AdminDashboard = observer(function AdminDashboard({
	getAccessToken,
	view,
	onNavigate,
}: AdminDashboardProps) {
	const rootStore = useRootStore();
	const { translations, admin, session, confirmation } = rootStore;
	const t = translations.adminTranslation;
	const locale = translations.locale;

	const [activeView, setActiveView] = useState<AdminView>(view ?? 'current-session');
	const [broadcast, setBroadcast] = useState({ title: '', body: '' });

	useEffect(() => {
		rootStore.setAccessTokenProvider(getAccessToken);
		rootStore.setPermissionReader(async () =>
			isAuth0Configured ? permissionsFromToken(await getAccessToken()) : everyPermission(),
		);
	}, [getAccessToken, rootStore]);

	useEffect(() => {
		setActiveView(view ?? 'current-session');
	}, [view]);

	// Opening the dashboard with no screen in the route, until it has landed or the worker has moved.
	const isLanding = useRef(view === undefined);

	const navigate = useCallback(
		(next: AdminView) => {
			isLanding.current = false;
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

	const hasLoadedSession = session.currentState !== null;
	const hasLoadedPermissions = admin.views.length > 0;

	// The landing depends on the session's phase and the worker's role, which arrive separately.
	useEffect(() => {
		if (isLanding.current && hasLoadedSession && hasLoadedPermissions) {
			isLanding.current = false;

			if (admin.landingView !== activeView) {
				navigate(admin.landingView);
			}
		}
	}, [activeView, admin, hasLoadedPermissions, hasLoadedSession, navigate]);

	const statusLabels: Record<VisitStatus, string> = adminVisitStatusLabels(locale);
	/**
	 * With no session configured a guest can still be added, with their details alone. Until the
	 * session has loaded, though, nothing is offered: "not known yet" is not "no session", and a form
	 * opened in that moment would start on details only and stay there once the session arrived.
	 */
	const sessionAdmissions = currentState ? manualAdmissionsFor(event?.status ?? null) : [];
	const currentSessionGuests = admin.sessionGuests
		.filter((guest) => guest.marketEventId === event?.id)
		.sort(LineOrder.compare);

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
				<SessionView
					statusLabels={statusLabels}
					sessionGuests={currentSessionGuests}
					admissions={sessionAdmissions}
					busy={admin.isBusy}
					onRun={(action) => void runMarketAction(action as MarketAction)}
					onAddGuest={(guest) => void addManualGuest(guest)}
					onNavigate={navigate}
				/>
			) : activeView === 'checklist' ? (
				<ChecklistView onNavigateSchedule={() => navigate('schedule')} />
			) : activeView === 'schedule' ? (
				<ScheduleView onNavigateSession={() => navigate('current-session')} />
			) : activeView === 'queue' ? (
				<QueueView onNavigateCurrentSession={() => navigate('current-session')} />
			) : activeView === 'broadcast' ? (
				<SessionBroadcastForm
					broadcast={broadcast}
					onBroadcastChange={setBroadcast}
					onSend={() => void sendBroadcast()}
				/>
			) : activeView === 'question-bank' ? (
				<PatternQuestionBank />
			) : activeView === 'reports' ? (
				<ReportsView
					getAccessToken={getAccessToken}
					canExport={admin.can('export:guest-data')}
					canSeeOdds={admin.can('read:stewardship')}
				/>
			) : activeView === 'guest-database' ? (
				<GuestDatabaseView
					statusLabels={statusLabels}
					admissions={sessionAdmissions}
					onRun={(guest, command) => void runGuestCommand(guest, command)}
					onAddGuest={(guest) => void addManualGuest(guest)}
				/>
			) : activeView === 'workers' ? (
				<WorkersView />
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
