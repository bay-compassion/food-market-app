import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';

import { everyPermission, isAuth0Configured, permissionsFromToken } from '../auth';
import type { ServiceProgress } from '../services/demoScenario';
import { admissionsFor, type GuestAdmission } from '../services/guestAdmission';
import {
	defaultSessionSettings,
	registrationClosesAtFrom,
	registrationOpensAtFrom,
	settingsFromEvent,
} from '../services/session-settings';
import { currentSessionState, type SessionStatus } from '../services/sessionStateMachine';
import type { VisitCommand, VisitStatus } from '../services/visitStateMachine';
import { adminVisitStatusLabels } from '../services/visitStatusLabels';
import type { MarketAction } from '../stores/admin.store';
import { useRootStore } from '../stores/react/store-context';
import { AdminDashboardLayout } from './admin/AdminDashboardLayout';
import { DevModeView } from './admin/DevModeView';
import { GuestDatabaseView } from './admin/GuestDatabaseView';
import { QuestionBankView } from './admin/QuestionBankView';
import { QueueView } from './admin/QueueView';
import { ReportsView } from './admin/ReportsView';
import { SessionBroadcastForm } from './admin/SessionBroadcastForm';
import { SessionHistoryView } from './admin/SessionHistoryView';
import { SessionView } from './admin/SessionView';
import type { AdminView, ManualGuest, Question, QueueGuest, SessionSettings } from './admin/types';

export type AdminDashboardProps = {
	getAccessToken: () => Promise<string>;
	view?: AdminView;
	onNavigate: (view: AdminView) => void;
};

const statuses: VisitStatus[] = [
	'waiting',
	'called',
	'served',
	'registered',
	'not_placed',
	'no_show',
	'cancelled',
];

/** The admin area: navigation, the session's status, and whichever screen is selected. */
export const AdminDashboard = observer(function AdminDashboard({
	getAccessToken,
	view = 'current-session',
	onNavigate,
}: AdminDashboardProps) {
	const rootStore = useRootStore();
	const { translations, admin, session } = rootStore;
	const t = translations.adminTranslation;
	const locale = translations.locale;

	const [activeView, setActiveView] = useState<AdminView>(view);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [settings, setSettings] = useState<SessionSettings>(defaultSessionSettings);
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

	/**
	 * Mirrors the server's session into the form the worker edits, but only when the server's own
	 * copy has actually changed. Polling delivers an identical overview every few seconds, and
	 * reapplying it would discard edits made between two polls.
	 */
	const appliedSettingsSignature = useRef('');

	useEffect(() => {
		if (!currentState) {
			return;
		}

		const signature = JSON.stringify({
			event: currentState.event,
			questions: currentState.questions,
		});

		if (signature === appliedSettingsSignature.current) {
			return;
		}

		appliedSettingsSignature.current = signature;
		setQuestions(
			currentState.questions.map(({ id, prompt, type, required }) => ({
				id,
				prompt,
				type,
				required,
			})),
		);
		setSettings(
			currentState.event ? settingsFromEvent(currentState.event) : defaultSessionSettings(),
		);
	}, [currentState]);

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
	/** With no session configured there is nothing to add a guest to. */
	const sessionAdmissions: GuestAdmission[] = event ? admissionsFor(event.status) : [];
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

	function saveSettings() {
		return admin.saveSettings({
			registrationOpensAt: registrationOpensAtFrom(settings),
			registrationClosesAt: registrationClosesAtFrom(settings),
			capacity: settings.capacity,
			sessionMode: settings.sessionMode,
			questions,
		});
	}

	/** The prompt shown before an action that a worker cannot undo from the same screen. */
	function confirmationFor(action: MarketAction) {
		const confirmations: Record<MarketAction, string> = {
			schedule_registration: t.confirmScheduleRegistration,
			open_registration: t.confirmOpenRegistration,
			close_registration: t.confirmCloseRegistration,
			reopen_registration: t.confirmReopenRegistration,
			run_lottery: t.confirmRunLottery,
			// Closing marks anyone still waiting or called as a no-show, so name the count first.
			close_session:
				outstandingCount > 0
					? `${outstandingCount} ${t.confirmCloseSessionOutstanding}`
					: t.confirmCloseSession,
			reset_session: t.confirmResetSession,
		};

		return confirmations[action];
	}

	async function runMarketAction(action: MarketAction) {
		if (window.confirm(confirmationFor(action))) {
			await admin.runMarketAction(action);
		}
	}

	async function saveAndStartRegistration() {
		const action: MarketAction =
			settings.sessionMode === 'scheduled' ? 'schedule_registration' : 'open_registration';

		if (!window.confirm(confirmationFor(action))) {
			return;
		}

		if (await saveSettings()) {
			await admin.runMarketAction(action);
		}
	}

	async function postponeRegistration() {
		if (!window.confirm(t.confirmPostponeRegistration)) {
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

	async function saveCapacityOverride() {
		if (!event) {
			return;
		}

		await admin.updateRegistrationOverrides(event.registrationClosesAt, settings.capacity);
	}

	function runGuestCommand(guest: QueueGuest, command: VisitCommand) {
		return admin.runGuestCommand(guest, command);
	}

	function addManualGuest(guest: ManualGuest, marketEventId?: string | null) {
		return admin.addGuest(guest, { marketEventId, locale });
	}

	async function sendBroadcast() {
		if (!window.confirm(t.broadcastConfirm)) {
			return;
		}

		if (await admin.sendBroadcast(broadcast)) {
			setBroadcast({ title: '', body: '' });
		}
	}

	async function loadScenario(stage: SessionStatus, serviceProgress?: ServiceProgress) {
		if (window.confirm(t.devModeConfirm)) {
			await admin.loadDemoScenario(stage, serviceProgress);
		}
	}

	return (
		<AdminDashboardLayout activeView={activeView} onNavigate={navigate}>
			{activeView === 'current-session' ? (
				<SessionView
					settings={settings}
					onSettingsChange={setSettings}
					extensionMinutes={extensionMinutes}
					onExtensionMinutesChange={setExtensionMinutes}
					postponementMinutes={postponementMinutes}
					onPostponementMinutesChange={setPostponementMinutes}
					event={event}
					sessionState={sessionState}
					statuses={statuses}
					counts={counts}
					statusLabels={statusLabels}
					registeredGuests={registeredSessionGuests}
					admissions={sessionAdmissions}
					busy={admin.isBusy}
					onSaveSettings={() => void saveSettings()}
					onSaveAndStartRegistration={() => void saveAndStartRegistration()}
					onPostponeRegistration={() => void postponeRegistration()}
					onExtendRegistration={() => void extendRegistration()}
					onSaveCapacityOverride={() => void saveCapacityOverride()}
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
				<QuestionBankView
					questions={questions}
					onQuestionsChange={setQuestions}
					busy={admin.isBusy}
					editable={event === null || event.status === 'draft'}
					onSave={() => void saveSettings()}
				/>
			) : activeView === 'reports' ? (
				<ReportsView getAccessToken={getAccessToken} canExport={admin.can('export:guest-data')} />
			) : activeView === 'guest-database' ? (
				<GuestDatabaseView
					searchQuery={searchQuery}
					onSearchQueryChange={setSearchQuery}
					guests={admin.guests}
					statusLabels={statusLabels}
					admissions={sessionAdmissions}
					busy={admin.isBusy}
					onSearch={() => void admin.searchGuests(searchQuery)}
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
