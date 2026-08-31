import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';

import { everyPermission, isAuth0Configured, permissionsFromToken } from '../auth';
import { adminFeedbackText } from '../services/admin-feedback';
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
import { DevModeView } from './admin/DevModeView';
import { GuestDatabaseView } from './admin/GuestDatabaseView';
import { QuestionBankView } from './admin/QuestionBankView';
import { QueueView } from './admin/QueueView';
import { ReportsView } from './admin/ReportsView';
import { SessionHistoryView } from './admin/SessionHistoryView';
import { SessionView } from './admin/SessionView';
import type { AdminView, ManualGuest, Question, QueueGuest, SessionSettings } from './admin/types';
import { EyebrowLabel } from './EyebrowLabel';

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

/*
 * Reports are the one admin screen meant for a desk: a wide table is easier to read than a narrow
 * one, and the rest of the app has no reason to widen with it.
 */
const Dashboard = styled.section<{ $wide: boolean }>`
	width: min(100% - 32px, ${({ $wide }) => ($wide ? '1600px' : '1180px')});
	margin: 0 auto;
	padding: 30px 0 60px;

	.admin-navigation {
		display: flex;
		gap: 8px;
		margin-bottom: 28px;
		padding-bottom: 4px;
		overflow-x: auto;
	}

	.admin-navigation button {
		flex: 0 0 auto;
		min-height: 44px;
		padding: 0 15px;
		border: 1.5px solid #c7d2cc;
		border-radius: var(--radius-pill);
		color: var(--color-brand);
		background: white;
		font-weight: 700;
		text-transform: capitalize;
	}

	.admin-navigation button.active {
		color: var(--color-on-brand);
		background: var(--color-brand);
		border-color: var(--color-brand);
	}

	.admin-content {
		min-width: 0;
	}

	.admin-heading {
		display: flex;
		flex-wrap: wrap;
		gap: 18px;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 28px;
	}

	.admin-heading h1 {
		color: var(--color-brand);
		margin-bottom: 8px;
	}

	.admin-heading p {
		color: var(--color-text-subtle);
		line-height: 1.5;
	}

	.event-state {
		padding: 9px 13px;
		border-radius: var(--radius-pill);
		background: #e5f4ed;
		color: #145c3c;
		font-size: 13px;
		font-weight: 700;
	}

	.event-state.registration_closed,
	.event-state.lottery_pending,
	.event-state.inactive {
		background: #fff1d8;
		color: #7a4b00;
	}

	.event-state.scheduled {
		background: #e8f0fb;
		color: #254d7a;
	}

	.event-state.service_started {
		background: #e9e7f9;
		color: #39306b;
	}

	.event-state.ended {
		background: #edf0ee;
		color: var(--color-text-subtle);
	}

	.admin-no-access {
		padding: 24px;
		border: 1.5px solid #c7d2cc;
		border-radius: var(--radius-lg);
		color: var(--color-text-subtle);
		line-height: 1.5;
		text-align: center;
	}

	.admin-feedback {
		margin-bottom: 16px;
		padding: 12px 14px;
		border-radius: var(--radius-sm);
		background: #eef5f3;
		color: var(--color-brand);
	}

	@media (min-width: 860px) {
		display: grid;
		grid-template-columns: 210px minmax(0, 1fr);
		gap: 42px;
		align-items: start;

		.admin-navigation {
			position: sticky;
			top: 24px;
			display: grid;
			gap: 8px;
			margin: 0;
			overflow: visible;
		}

		.admin-navigation button {
			width: 100%;
			min-height: 50px;
			border-radius: 12px;
			text-align: start;
		}
	}
`;

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
	const viewLabels: Record<AdminView, string> = {
		'current-session': t.currentSession,
		queue: t.queue,
		'question-bank': t.questionBank,
		'guest-database': t.guestDatabase,
		'session-history': t.historySessions,
		reports: t.reports,
		'dev-mode': t.devMode,
	};
	const navigation = admin.views.map((id) => ({ id, label: viewLabels[id] }));
	const feedback = adminFeedbackText(admin.feedback, t);
	const sessionState = currentSessionState(event?.status);
	const sessionStatusLabel = (() => {
		switch (sessionState) {
			case 'scheduled':
				return t.scheduled;
			case 'registration_open':
				return t.open;
			case 'registration_closed':
				return t.closed;
			case 'lottery_pending':
				return t.lotteryPending;
			case 'service_started':
				return t.serviceStarted;
			default:
				return t.noActiveSession;
		}
	})();
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
		<Dashboard className="admin-dashboard" $wide={activeView === 'reports'}>
			<nav className="admin-navigation" aria-label={t.adminTitle}>
				{navigation.map((item) => (
					<button
						key={item.id}
						type="button"
						className={activeView === item.id ? 'active' : undefined}
						aria-current={activeView === item.id ? 'page' : undefined}
						onClick={() => navigate(item.id)}
					>
						{item.label}
					</button>
				))}
			</nav>

			{/* Signed in, but holding no role yet. Saying so beats an admin area with nothing in it. */}
			{!navigation.length ? (
				<p className="admin-no-access" role="status">
					{t.noAccess}
				</p>
			) : (
				<div className="admin-content">
					{/* The queue view drops the eyebrow and description: during service this is the only
					    screen a worker uses, and that chrome pushes the controls off a phone screen. */}
					<header className={`admin-heading${activeView === 'queue' ? ' compact' : ''}`}>
						<div>
							{activeView !== 'queue' ? <EyebrowLabel tone="brand" label={t.adminEyebrow} /> : null}
							<h1>{navigation.find((item) => item.id === activeView)?.label}</h1>
							{activeView !== 'queue' ? <p>{t.adminDescription}</p> : null}
						</div>
						{activeView === 'current-session' || activeView === 'queue' ? (
							<span className={`event-state ${sessionState}`}>{sessionStatusLabel}</span>
						) : null}
					</header>

					{feedback ? (
						<p className="admin-feedback" role="status">
							{feedback}
						</p>
					) : null}

					{activeView === 'current-session' ? (
						<SessionView
							settings={settings}
							onSettingsChange={setSettings}
							extensionMinutes={extensionMinutes}
							onExtensionMinutesChange={setExtensionMinutes}
							postponementMinutes={postponementMinutes}
							onPostponementMinutesChange={setPostponementMinutes}
							broadcast={broadcast}
							onBroadcastChange={setBroadcast}
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
							onSendBroadcast={() => void sendBroadcast()}
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
					) : activeView === 'question-bank' ? (
						<QuestionBankView
							questions={questions}
							onQuestionsChange={setQuestions}
							busy={admin.isBusy}
							editable={event === null || event.status === 'draft'}
							onSave={() => void saveSettings()}
						/>
					) : activeView === 'reports' ? (
						<ReportsView
							getAccessToken={getAccessToken}
							canExport={admin.can('export:guest-data')}
						/>
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
				</div>
			)}
		</Dashboard>
	);
});
