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
import { QuestionBankView } from './admin/QuestionBankView';
import { QueueView } from './admin/QueueView';
import { ReportsView } from './admin/ReportsView';
import { SessionBroadcastForm } from './admin/SessionBroadcastForm';
import { SessionHistoryView } from './admin/SessionHistoryView';
import { SessionView } from './admin/SessionView';
import type { AdminView, ManualGuest, QueueGuest } from './admin/types';

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
	const [extensionMinutes, setExtensionMinutes] = useState(30);
	const [postponementMinutes, setPostponementMinutes] = useState(30);
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
	const registeredSessionGuests = currentSessionGuests.filter(
		(guest) => guest.status === 'registered',
	);
	const outstandingCount = (counts.waiting ?? 0) + (counts.called ?? 0);
	const prompts = new MarketActionPrompts(t, outstandingCount);

	async function runMarketAction(action: MarketAction) {
		if (await confirmation.ask(prompts.for(action))) {
			await admin.runMarketAction(action);
		}
	}

	async function postponeRegistration() {
		const confirmed = await confirmation.ask({
			question: t.confirmPostponeRegistration,
			confirmLabel: t.confirmContinue,
			dismissLabel: t.cancel,
		});

		if (!confirmed) {
			return;
		}

		if (await admin.postponeRegistration(postponementMinutes)) {
			setPostponementMinutes(30);
		}
	}

	async function extendRegistration() {
		if (!event) {
			return;
		}

		const closesAt = new Date(
			new Date(event.registrationClosesAt).valueOf() + extensionMinutes * 60_000,
		).toISOString();

		if (await admin.updateRegistrationOverrides(closesAt, event.capacity)) {
			setExtensionMinutes(30);
		}
	}

	async function saveCapacityOverride(capacity: number) {
		if (!event) {
			return;
		}

		await admin.updateRegistrationOverrides(event.registrationClosesAt, capacity);
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
					extensionMinutes={extensionMinutes}
					onExtensionMinutesChange={setExtensionMinutes}
					postponementMinutes={postponementMinutes}
					onPostponementMinutesChange={setPostponementMinutes}
					event={event}
					sessionState={sessionState}
					counts={counts}
					statusLabels={statusLabels}
					registeredGuests={registeredSessionGuests}
					admissions={sessionAdmissions}
					busy={admin.isBusy}
					onPostponeRegistration={() => void postponeRegistration()}
					onExtendRegistration={() => void extendRegistration()}
					onSaveCapacityOverride={(capacity) => void saveCapacityOverride(capacity)}
					onRun={(action) => void runMarketAction(action as MarketAction)}
					onAddGuest={(guest) => void addManualGuest(guest)}
					onNavigateQueue={() => navigate('queue')}
				/>
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
				// Read-only until the question bank edits the recurrence pattern's questions.
				<QuestionBankView
					questions={currentState?.questions ?? []}
					onQuestionsChange={() => {}}
					busy={admin.isBusy}
					editable={false}
					onSave={() => {}}
				/>
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
