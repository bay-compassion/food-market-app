<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { useAdminTranslation } from '@/stores/hooks/use-translation.ts';

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
import { useRootStore } from '../stores/root.store';
import DevModeView from './admin/DevModeView.vue';
import GuestDatabaseView from './admin/GuestDatabaseView.vue';
import QuestionBankView from './admin/QuestionBankView.vue';
import QueueView from './admin/QueueView.vue';
import ReportsView from './admin/ReportsView.vue';
import SessionHistoryView from './admin/SessionHistoryView.vue';
import SessionView from './admin/SessionView.vue';
import type { AdminView, ManualGuest, Question, QueueGuest, SessionSettings } from './admin/types';
import EyebrowLabel from './EyebrowLabel.vue';

type GuestStatus = VisitStatus;

const props = withDefaults(
	defineProps<{ getAccessToken: () => Promise<string>; view?: AdminView }>(),
	{ view: 'current-session' },
);
const emit = defineEmits<{ navigate: [view: AdminView] }>();
const rootStore = useRootStore();
const { translations, admin, session } = rootStore;
const locale = translations.locale;

rootStore.setAccessTokenProvider(props.getAccessToken);
rootStore.setPermissionReader(async () =>
	isAuth0Configured ? permissionsFromToken(await props.getAccessToken()) : everyPermission(),
);

const t = useAdminTranslation();
const activeView = ref<AdminView>(props.view);
const event = computed(() => session.currentState?.event ?? null);
const counts = computed(() => session.currentState?.counts ?? {});
const questions = ref<Question[]>([]);
const searchQuery = ref('');
const settings = ref<SessionSettings>(defaultSessionSettings());
const extensionMinutes = ref(30);
const postponementMinutes = ref(30);
const broadcast = ref({ title: '', body: '' });

const statuses: GuestStatus[] = [
	'waiting',
	'called',
	'served',
	'registered',
	'not_placed',
	'no_show',
	'cancelled',
];
const statusLabels = computed<Record<GuestStatus, string>>(() => adminVisitStatusLabels(locale));
const viewLabels = computed<Record<AdminView, string>>(() => ({
	'current-session': t.value.currentSession,
	queue: t.value.queue,
	'question-bank': t.value.questionBank,
	'guest-database': t.value.guestDatabase,
	'session-history': t.value.historySessions,
	reports: t.value.reports,
	'dev-mode': t.value.devMode,
}));
const navigation = computed<{ id: AdminView; label: string }[]>(() =>
	admin.views.map((id) => ({ id, label: viewLabels.value[id] })),
);
const feedback = computed(() => adminFeedbackText(admin.feedback, t.value));

const sessionState = computed(() => currentSessionState(event.value?.status));
const sessionStatusLabel = computed(() => {
	switch (sessionState.value) {
		case 'scheduled':
			return t.value.scheduled;
		case 'registration_open':
			return t.value.open;
		case 'registration_closed':
			return t.value.closed;
		case 'service_started':
			return t.value.serviceStarted;
		default:
			return t.value.noActiveSession;
	}
});
/** With no session configured there is nothing to add a guest to. */
const sessionAdmissions = computed(() =>
	event.value ? admissionsFor(event.value.status) : ([] as GuestAdmission[]),
);
const currentSessionGuests = computed(() =>
	admin.sessionGuests
		.filter((guest) => guest.marketEventId === event.value?.id)
		.sort(
			(first, second) =>
				(first.queuePosition ?? Number.MAX_SAFE_INTEGER) -
				(second.queuePosition ?? Number.MAX_SAFE_INTEGER),
		),
);
const registeredSessionGuests = computed(() =>
	currentSessionGuests.value.filter((guest) => guest.status === 'registered'),
);
const outstandingCount = computed(() => (counts.value.waiting ?? 0) + (counts.value.called ?? 0));

watch(
	() => props.view,
	(view) => {
		activeView.value = view;
	},
);

/**
 * Mirrors the server's session into the form the worker edits, but only when the server's own
 * copy has actually changed. Polling delivers an identical overview every few seconds, and
 * reapplying it would discard edits made between two polls.
 */
let appliedSettingsSignature = '';

watch(
	() => session.currentState,
	(data) => {
		if (!data) {
			return;
		}
		const signature = JSON.stringify({ event: data.event, questions: data.questions });

		if (signature === appliedSettingsSignature) {
			return;
		}
		appliedSettingsSignature = signature;
		questions.value = data.questions.map(({ id, prompt, type, required }) => ({
			id,
			prompt,
			type,
			required,
		}));
		settings.value = data.event ? settingsFromEvent(data.event) : defaultSessionSettings();
	},
	{ immediate: true },
);

function navigate(view: AdminView) {
	activeView.value = view;
	emit('navigate', view);
}

async function loadDashboard() {
	await admin.load();

	// The route can name a screen this worker cannot open — a shared link, or a role that changed
	// since they last bookmarked it. Land them on the first one they can.
	const allowed = admin.views;

	if (allowed.length > 0 && !allowed.includes(activeView.value)) {
		navigate(allowed[0]!);
	}
}

async function saveSettings() {
	return admin.saveSettings({
		registrationOpensAt: registrationOpensAtFrom(settings.value),
		registrationClosesAt: registrationClosesAtFrom(settings.value),
		capacity: settings.value.capacity,
		sessionMode: settings.value.sessionMode,
		questions: questions.value,
	});
}

/** The prompt shown before an action that a worker cannot undo from the same screen. */
function confirmationFor(action: MarketAction) {
	const confirmations: Record<MarketAction, string> = {
		schedule_registration: t.value.confirmScheduleRegistration,
		open_registration: t.value.confirmOpenRegistration,
		close_registration: t.value.confirmCloseRegistration,
		reopen_registration: t.value.confirmReopenRegistration,
		run_lottery: t.value.confirmRunLottery,
		// Closing marks anyone still waiting or called as a no-show, so name the count first.
		close_session:
			outstandingCount.value > 0
				? `${outstandingCount.value} ${t.value.confirmCloseSessionOutstanding}`
				: t.value.confirmCloseSession,
		reset_session: t.value.confirmResetSession,
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
		settings.value.sessionMode === 'scheduled' ? 'schedule_registration' : 'open_registration';

	if (!window.confirm(confirmationFor(action))) {
		return;
	}

	if (await saveSettings()) {
		await admin.runMarketAction(action);
	}
}

async function postponeRegistration() {
	if (!window.confirm(t.value.confirmPostponeRegistration)) {
		return;
	}

	if (await admin.postponeRegistration(postponementMinutes.value)) {
		postponementMinutes.value = 30;
	}
}

async function extendRegistration() {
	if (!event.value) {
		return;
	}
	const closesAt = new Date(
		new Date(event.value.registrationClosesAt).valueOf() + extensionMinutes.value * 60_000,
	).toISOString();

	if (await admin.updateRegistrationOverrides(closesAt, event.value.capacity)) {
		extensionMinutes.value = 30;
	}
}

async function saveCapacityOverride() {
	if (!event.value) {
		return;
	}
	await admin.updateRegistrationOverrides(
		event.value.registrationClosesAt,
		settings.value.capacity,
	);
}

function runGuestCommand(guest: QueueGuest, command: VisitCommand) {
	return admin.runGuestCommand(guest, command);
}

function addManualGuest(guest: ManualGuest, marketEventId?: string | null) {
	return admin.addGuest(guest, { marketEventId, locale });
}

async function sendBroadcast() {
	if (!window.confirm(t.value.broadcastConfirm)) {
		return;
	}

	if (await admin.sendBroadcast(broadcast.value)) {
		broadcast.value = { title: '', body: '' };
	}
}

async function loadScenario(stage: SessionStatus, serviceProgress?: ServiceProgress) {
	if (window.confirm(t.value.devModeConfirm)) {
		await admin.loadDemoScenario(stage, serviceProgress);
	}
}

onMounted(loadDashboard);
</script>

<template>
	<!-- Reports are the one admin screen meant for a desk: a wide table is easier to read than a
	     narrow one, and the rest of the app has no reason to widen with it. -->
	<section class="admin-dashboard" :class="{ wide: activeView === 'reports' }">
		<nav class="admin-navigation" :aria-label="t.adminTitle">
			<button
				v-for="item in navigation"
				:key="item.id"
				type="button"
				:class="{ active: activeView === item.id }"
				:aria-current="activeView === item.id ? 'page' : undefined"
				@click="navigate(item.id)"
			>
				{{ item.label }}
			</button>
		</nav>

		<!-- Signed in, but holding no role yet. Saying so beats an admin area with nothing in it. -->
		<p v-if="!navigation.length" class="admin-no-access" role="status">{{ t.noAccess }}</p>

		<div v-else class="admin-content">
			<!-- The queue view drops the eyebrow and description: during service this is the only
			     screen a worker uses, and that chrome pushes the controls off a phone screen. -->
			<header class="admin-heading" :class="{ compact: activeView === 'queue' }">
				<div>
					<EyebrowLabel v-if="activeView !== 'queue'" tone="brand">
						{{ t.adminEyebrow }}
					</EyebrowLabel>
					<h1>{{ navigation.find((item) => item.id === activeView)?.label }}</h1>
					<p v-if="activeView !== 'queue'">{{ t.adminDescription }}</p>
				</div>
				<span
					v-if="activeView === 'current-session' || activeView === 'queue'"
					class="event-state"
					:class="sessionState"
				>
					{{ sessionStatusLabel }}
				</span>
			</header>

			<p v-if="feedback" class="admin-feedback" role="status">{{ feedback }}</p>

			<SessionView
				v-if="activeView === 'current-session'"
				v-model:settings="settings"
				v-model:extension-minutes="extensionMinutes"
				v-model:postponement-minutes="postponementMinutes"
				v-model:broadcast="broadcast"
				:locale="locale"
				:event="event"
				:session-state="sessionState"
				:statuses="statuses"
				:counts="counts"
				:status-labels="statusLabels"
				:registered-guests="registeredSessionGuests"
				:admissions="sessionAdmissions"
				:busy="admin.isBusy"
				@save-settings="saveSettings"
				@save-and-start-registration="saveAndStartRegistration"
				@postpone-registration="postponeRegistration"
				@extend-registration="extendRegistration"
				@save-capacity-override="saveCapacityOverride"
				@run="runMarketAction($event as MarketAction)"
				@add-guest="addManualGuest"
				@send-broadcast="sendBroadcast"
				@navigate-queue="navigate('queue')"
			/>

			<QueueView
				v-else-if="activeView === 'queue'"
				:locale="locale"
				:guests="currentSessionGuests"
				:counts="counts"
				:status-labels="statusLabels"
				:service-started="sessionState === 'service_started'"
				:admissions="sessionAdmissions"
				:busy="admin.isBusy"
				@call-next="admin.callNext"
				@run="runGuestCommand"
				@add-guest="addManualGuest"
				@close-session="runMarketAction('close_session')"
				@navigate-current-session="navigate('current-session')"
			/>

			<QuestionBankView
				v-else-if="activeView === 'question-bank'"
				v-model:questions="questions"
				:locale="locale"
				:busy="admin.isBusy"
				:editable="event === null || event.status === 'draft'"
				@save="saveSettings"
			/>

			<ReportsView
				v-else-if="activeView === 'reports'"
				:locale="locale"
				:get-access-token="getAccessToken"
				:can-export="admin.can('export:guest-data')"
			/>

			<GuestDatabaseView
				v-else-if="activeView === 'guest-database'"
				v-model:search-query="searchQuery"
				:locale="locale"
				:guests="admin.guests"
				:status-labels="statusLabels"
				:admissions="sessionAdmissions"
				:busy="admin.isBusy"
				@search="admin.searchGuests(searchQuery)"
				@run="runGuestCommand"
				@add-guest="addManualGuest"
			/>

			<DevModeView
				v-else-if="activeView === 'dev-mode'"
				:locale="locale"
				:busy="admin.isBusy"
				@load="loadScenario"
			/>

			<SessionHistoryView
				v-else
				:locale="locale"
				:history="admin.history"
				:busy="admin.isBusy"
				@add-guest="addManualGuest"
			/>
		</div>
	</section>
</template>

<style scoped>
.admin-dashboard {
	width: min(100% - 32px, 1180px);
	margin: 0 auto;
	padding: 30px 0 60px;
}
.admin-dashboard.wide {
	width: min(100% - 32px, 1600px);
}
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
	.admin-dashboard {
		display: grid;
		grid-template-columns: 210px minmax(0, 1fr);
		gap: 42px;
		align-items: start;
	}
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
</style>
