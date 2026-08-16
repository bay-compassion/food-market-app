<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { adminTranslations } from '../adminLocales';
import { everyPermission, isAuth0Configured, permissionsFromToken } from '../auth';
import { translations, type Locale } from '../locales';
import type { ServiceProgress } from '../services/demoScenario';
import { admissionsFor, type GuestAdmission } from '../services/guestAdmission';
import { lotteryWeightFor } from '../services/lotteryWeight';
import type { Permission } from '../services/permissions';
import {
	currentSessionState,
	type SessionCommand,
	type SessionStatus,
} from '../services/sessionStateMachine';
import {
	visitCommandTarget,
	type VisitCommand,
	type VisitStatus,
} from '../services/visitStateMachine';
import { adminVisitStatusLabels } from '../services/visitStatusLabels';
import DevModeView from './admin/DevModeView.vue';
import GuestDatabaseView from './admin/GuestDatabaseView.vue';
import QuestionBankView from './admin/QuestionBankView.vue';
import QueueView from './admin/QueueView.vue';
import ReportsView from './admin/ReportsView.vue';
import SessionHistoryView from './admin/SessionHistoryView.vue';
import SessionView from './admin/SessionView.vue';
import type {
	AdminMarketEvent,
	AdminView,
	HistoricalEvent,
	ManualGuest,
	Question,
	QueueGuest,
	SessionSettings,
} from './admin/types';
import { viewsFor } from './admin/types';
import EyebrowLabel from './EyebrowLabel.vue';

type GuestStatus = VisitStatus;
type Guest = QueueGuest & { marketEventId: string | null };
type Overview = {
	event: AdminMarketEvent | null;
	questions: Question[];
	counts: Partial<Record<GuestStatus, number>>;
};

const props = withDefaults(
	defineProps<{ locale: Locale; getAccessToken: () => Promise<string>; view?: AdminView }>(),
	{ view: 'current-session' },
);
const emit = defineEmits<{ navigate: [view: AdminView] }>();
const t = computed(() => adminTranslations[props.locale]);
const base = computed(() => translations[props.locale]);
const activeView = ref<AdminView>(props.view);
const granted = ref<Permission[]>([]);
const event = ref<AdminMarketEvent | null>(null);
const counts = ref<Overview['counts']>({});
const questions = ref<Question[]>([]);
const guests = ref<Guest[]>([]);
const sessionGuests = ref<Guest[]>([]);
const history = ref<HistoricalEvent[]>([]);
const searchQuery = ref('');
const feedback = ref('');
const isBusy = ref(false);
const settings = ref<SessionSettings>({
	sessionMode: 'scheduled',
	registrationOpensAt: '',
	adHocClosesAt: '',
	durationMinutes: 60,
	capacity: 50,
});
const extensionMinutes = ref(30);
const postponementMinutes = ref(30);
let sessionRefreshTimer: ReturnType<typeof setTimeout> | undefined;
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
const statusLabels = computed<Record<GuestStatus, string>>(() =>
	adminVisitStatusLabels(props.locale),
);
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
	viewsFor(granted.value).map((id) => ({ id, label: viewLabels.value[id] })),
);
function can(permission: Permission) {
	return granted.value.includes(permission);
}
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
	sessionGuests.value
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

function navigate(view: AdminView) {
	activeView.value = view;
	emit('navigate', view);
}

async function authHeaders(includeJson = false) {
	return {
		Authorization: `Bearer ${await props.getAccessToken()}`,
		...(includeJson ? { 'Content-Type': 'application/json' } : {}),
	};
}

function toLocalDateTime(value: string | Date) {
	const date = new Date(value);
	const offset = date.getTimezoneOffset() * 60_000;

	return new Date(date.valueOf() - offset).toISOString().slice(0, 16);
}

function setDefaultSettings() {
	const now = new Date();
	const opens = new Date(now);
	opens.setMinutes(Math.ceil(opens.getMinutes() / 15) * 15, 0, 0);
	if (opens <= now) {
		opens.setMinutes(opens.getMinutes() + 15);
	}
	const closes = new Date(opens.valueOf() + 60 * 60_000);
	settings.value.sessionMode = 'scheduled';
	settings.value.registrationOpensAt = toLocalDateTime(opens);
	settings.value.adHocClosesAt = toLocalDateTime(closes);
	settings.value.durationMinutes = 60;
}

function registrationClosesAt() {
	if (settings.value.sessionMode === 'ad_hoc') {
		return new Date(settings.value.adHocClosesAt).toISOString();
	}

	return new Date(
		new Date(settings.value.registrationOpensAt).valueOf() +
			settings.value.durationMinutes * 60_000,
	).toISOString();
}

function applyOverview(data: Overview) {
	if (sessionRefreshTimer) {
		clearTimeout(sessionRefreshTimer);
	}
	event.value = data.event;
	counts.value = data.counts;
	questions.value = data.questions.map(({ id, prompt, type, required }) => ({
		id,
		prompt,
		type,
		required,
	}));
	if (data.event) {
		settings.value.sessionMode = data.event.sessionMode ?? 'scheduled';
		settings.value.registrationOpensAt = toLocalDateTime(data.event.registrationOpensAt);
		settings.value.adHocClosesAt = toLocalDateTime(data.event.registrationClosesAt);
		settings.value.durationMinutes = Math.max(
			1,
			Math.round(
				(new Date(data.event.registrationClosesAt).valueOf() -
					new Date(data.event.registrationOpensAt).valueOf()) /
					60_000,
			),
		);
		settings.value.capacity = data.event.capacity;
		const now = new Date();
		const nextTransitionAt =
			data.event.status === 'scheduled'
				? new Date(data.event.registrationOpensAt)
				: data.event.status === 'registration_open'
					? new Date(data.event.registrationClosesAt)
					: null;
		if (nextTransitionAt && nextTransitionAt > now) {
			const transitionDelay = nextTransitionAt.valueOf() - now.valueOf() + 250;
			sessionRefreshTimer = setTimeout(
				refreshCurrentSession,
				Math.min(
					data.event.status === 'registration_open'
						? Math.min(transitionDelay, 15_000)
						: transitionDelay,
					2_147_000_000,
				),
			);
		} else if (data.event.status === 'service_started') {
			// Several workers can run the queue at once, so keep polling while service is live —
			// otherwise one worker never sees the guests another has already called.
			sessionRefreshTimer = setTimeout(refreshCurrentSession, 15_000);
		}
	} else {
		settings.value.capacity = 50;
		setDefaultSettings();
	}
}

async function loadOverview() {
	const response = await fetch('/api/market', { headers: await authHeaders() });
	if (!response.ok) {
		throw new Error('overview');
	}
	applyOverview((await response.json()) as Overview);
}

async function loadGuests() {
	const params = new URLSearchParams({ scope: 'all' });
	if (searchQuery.value.trim()) {
		params.set('q', searchQuery.value.trim());
	}
	const response = await fetch(`/api/guests?${params}`, { headers: await authHeaders() });
	if (!response.ok) {
		throw new Error('guests');
	}
	guests.value = (await response.json()) as Guest[];
}

async function loadSessionGuests() {
	if (!event.value) {
		sessionGuests.value = [];

		return;
	}
	const params = new URLSearchParams({ marketEventId: event.value.id });
	const response = await fetch(`/api/guests?${params}`, { headers: await authHeaders() });
	if (!response.ok) {
		throw new Error('session-guests');
	}
	sessionGuests.value = (await response.json()) as Guest[];
}

async function refreshCurrentSession() {
	try {
		await loadOverview();
		await loadSessionGuests();
	} catch {
		feedback.value = t.value.error;
	}
}

async function loadHistory() {
	const response = await fetch('/api/market?view=history', { headers: await authHeaders() });
	if (!response.ok) {
		throw new Error('history');
	}
	history.value = (await response.json()) as HistoricalEvent[];
}

async function loadDashboard() {
	try {
		granted.value = isAuth0Configured
			? permissionsFromToken(await props.getAccessToken())
			: everyPermission();
	} catch {
		granted.value = [];
	}
	// The route can name a screen this worker cannot open — a shared link, or a role that changed
	// since they last bookmarked it. Land them on the first one they can.
	const allowed = viewsFor(granted.value);
	if (allowed.length > 0 && !allowed.includes(activeView.value)) {
		navigate(allowed[0]!);
	}
	try {
		await loadOverview();
		// Only ask for what this worker is allowed to see; the rest would come back 403 and read
		// as a broken screen rather than as a screen that was never theirs.
		if (can('run:queue')) {
			await Promise.all([loadGuests(), loadSessionGuests(), loadHistory()]);
		}
	} catch {
		feedback.value = t.value.error;
	}
}

async function saveSettings() {
	isBusy.value = true;
	feedback.value = '';
	try {
		const response = await fetch('/api/market', {
			method: 'PUT',
			headers: await authHeaders(true),
			body: JSON.stringify({
				registrationOpensAt:
					settings.value.sessionMode === 'ad_hoc'
						? new Date().toISOString()
						: new Date(settings.value.registrationOpensAt).toISOString(),
				registrationClosesAt: registrationClosesAt(),
				capacity: settings.value.capacity,
				sessionMode: settings.value.sessionMode,
				questions: questions.value,
			}),
		});
		if (!response.ok) {
			throw new Error('save');
		}
		applyOverview((await response.json()) as Overview);
		feedback.value = t.value.saved;

		return true;
	} catch {
		feedback.value = t.value.error;

		return false;
	} finally {
		isBusy.value = false;
	}
}

type MarketAction = Exclude<SessionCommand, 'postpone_registration' | 'update_registration'>;

async function runMarketAction(action: MarketAction, isConfirmed = false) {
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
	if (!isConfirmed && !window.confirm(confirmations[action])) {
		return;
	}
	isBusy.value = true;
	feedback.value = '';
	try {
		const response = await fetch('/api/market', {
			method: 'POST',
			headers: await authHeaders(true),
			body: JSON.stringify({ action }),
		});
		if (!response.ok) {
			throw new Error('action');
		}
		applyOverview((await response.json()) as Overview);
		await Promise.all([loadGuests(), loadSessionGuests()]);
		feedback.value = action === 'run_lottery' ? t.value.drawComplete : t.value.sessionUpdated;
	} catch {
		feedback.value = t.value.error;
	} finally {
		isBusy.value = false;
	}
}

async function saveAndStartRegistration() {
	const action: MarketAction =
		settings.value.sessionMode === 'scheduled' ? 'schedule_registration' : 'open_registration';
	const confirmation =
		action === 'schedule_registration'
			? t.value.confirmScheduleRegistration
			: t.value.confirmOpenRegistration;
	if (!window.confirm(confirmation)) {
		return;
	}
	if (await saveSettings()) {
		await runMarketAction(action, true);
	}
}

async function postponeRegistration() {
	if (!window.confirm(t.value.confirmPostponeRegistration)) {
		return;
	}
	isBusy.value = true;
	feedback.value = '';
	try {
		const response = await fetch('/api/market', {
			method: 'POST',
			headers: await authHeaders(true),
			body: JSON.stringify({
				action: 'postpone_registration',
				minutes: postponementMinutes.value,
			}),
		});
		if (!response.ok) {
			throw new Error('postpone');
		}
		applyOverview((await response.json()) as Overview);
		postponementMinutes.value = 30;
		feedback.value = t.value.sessionUpdated;
	} catch {
		feedback.value = t.value.error;
	} finally {
		isBusy.value = false;
	}
}

async function updateRegistrationOverrides(registrationClosesAt: string, capacity: number) {
	if (!event.value) {
		return false;
	}
	isBusy.value = true;
	feedback.value = '';
	try {
		const response = await fetch('/api/market', {
			method: 'POST',
			headers: await authHeaders(true),
			body: JSON.stringify({
				action: 'update_registration',
				registrationClosesAt,
				capacity,
			}),
		});
		if (!response.ok) {
			throw new Error('override');
		}
		applyOverview((await response.json()) as Overview);
		feedback.value = t.value.saved;

		return true;
	} catch {
		feedback.value = t.value.error;

		return false;
	} finally {
		isBusy.value = false;
	}
}

async function extendRegistration() {
	if (!event.value) {
		return;
	}
	const closesAt = new Date(
		new Date(event.value.registrationClosesAt).valueOf() + extensionMinutes.value * 60_000,
	).toISOString();
	if (await updateRegistrationOverrides(closesAt, event.value.capacity)) {
		extensionMinutes.value = 30;
	}
}

async function saveCapacityOverride() {
	if (!event.value) {
		return;
	}
	await updateRegistrationOverrides(event.value.registrationClosesAt, settings.value.capacity);
}

async function runGuestCommand(guest: QueueGuest, command: VisitCommand) {
	const previous = guest.status;
	guest.status = visitCommandTarget(command);
	try {
		const response = await fetch('/api/guests', {
			method: 'PATCH',
			headers: await authHeaders(true),
			body: JSON.stringify({ id: guest.id, command }),
		});
		if (!response.ok) {
			throw new Error('command');
		}
		await Promise.all([loadOverview(), loadSessionGuests()]);
	} catch {
		guest.status = previous;
		feedback.value = t.value.error;
	}
}

/**
 * Adds a guest by hand. `marketEventId` defaults to the live session, but the history view passes
 * a finished session's id to record someone who was served outside the app.
 */
async function addManualGuest(guest: ManualGuest, marketEventId = event.value?.id ?? null) {
	isBusy.value = true;
	feedback.value = '';
	try {
		const response = await fetch('/api/guests', {
			method: 'POST',
			headers: await authHeaders(true),
			body: JSON.stringify({
				...guest,
				// The form speaks in named tiers; the API takes the multiplier behind one.
				lotteryWeight: lotteryWeightFor(guest.lotteryWeightTier),
				locale: props.locale,
				marketEventId,
				answers: {},
				source: 'admin',
			}),
		});
		if (!response.ok) {
			throw new Error('guest');
		}
		await loadOverview();
		await Promise.all([loadGuests(), loadSessionGuests(), loadHistory()]);
	} catch {
		feedback.value = t.value.error;
	} finally {
		isBusy.value = false;
	}
}

async function callNextGuests(count: number) {
	isBusy.value = true;
	feedback.value = '';
	try {
		const response = await fetch('/api/queue', {
			method: 'POST',
			headers: await authHeaders(true),
			body: JSON.stringify({ action: 'call_next', count }),
		});
		if (!response.ok) {
			throw new Error('call_next');
		}
		const { called } = (await response.json()) as { called: string[] };
		await Promise.all([loadOverview(), loadSessionGuests()]);
		if (!called.length) {
			feedback.value = t.value.noWaitingGuests;
		}
	} catch {
		feedback.value = t.value.error;
	} finally {
		isBusy.value = false;
	}
}

async function sendBroadcast() {
	if (!window.confirm(t.value.broadcastConfirm)) {
		return;
	}
	isBusy.value = true;
	feedback.value = '';
	try {
		const response = await fetch('/api/broadcast', {
			method: 'POST',
			headers: await authHeaders(true),
			body: JSON.stringify(broadcast.value),
		});
		if (!response.ok) {
			throw new Error('broadcast');
		}
		const result = (await response.json()) as { queued: number };
		feedback.value = result.queued
			? `${t.value.broadcastQueued} ${result.queued}`
			: t.value.broadcastNoRecipients;
		if (result.queued) {
			broadcast.value = { title: '', body: '' };
		}
	} catch {
		feedback.value = t.value.error;
	} finally {
		isBusy.value = false;
	}
}

/**
 * Replaces the current session with fake data staged at `stage`, for demos and screenshots. This
 * is destructive to whatever session is currently live, so it is confirmed the same way the other
 * session-lifecycle actions in `runMarketAction` are.
 */
async function loadScenario(stage: SessionStatus, serviceProgress?: ServiceProgress) {
	if (!window.confirm(t.value.devModeConfirm)) {
		return;
	}
	isBusy.value = true;
	feedback.value = '';
	try {
		const response = await fetch('/api/demo-data', {
			method: 'POST',
			headers: await authHeaders(true),
			body: JSON.stringify({ stage, serviceProgress }),
		});
		if (!response.ok) {
			throw new Error('demo-data');
		}
		applyOverview((await response.json()) as Overview);
		await Promise.all([loadGuests(), loadSessionGuests(), loadHistory()]);
		feedback.value = t.value.devModeLoaded;
	} catch {
		feedback.value = t.value.error;
	} finally {
		isBusy.value = false;
	}
}

setDefaultSettings();
onMounted(loadDashboard);
onBeforeUnmount(() => clearTimeout(sessionRefreshTimer));
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
						{{ base.adminEyebrow }}
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
				:busy="isBusy"
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
				:busy="isBusy"
				@call-next="callNextGuests"
				@run="runGuestCommand"
				@add-guest="addManualGuest"
				@close-session="runMarketAction('close_session')"
				@navigate-current-session="navigate('current-session')"
			/>

			<QuestionBankView
				v-else-if="activeView === 'question-bank'"
				v-model:questions="questions"
				:locale="locale"
				:busy="isBusy"
				:editable="event === null || event.status === 'draft'"
				@save="saveSettings"
			/>

			<ReportsView
				v-else-if="activeView === 'reports'"
				:locale="locale"
				:get-access-token="getAccessToken"
				:can-export="can('export:guest-data')"
			/>

			<GuestDatabaseView
				v-else-if="activeView === 'guest-database'"
				v-model:search-query="searchQuery"
				:locale="locale"
				:guests="guests"
				:status-labels="statusLabels"
				:admissions="sessionAdmissions"
				:busy="isBusy"
				@search="loadGuests"
				@run="runGuestCommand"
				@add-guest="addManualGuest"
			/>

			<DevModeView
				v-else-if="activeView === 'dev-mode'"
				:locale="locale"
				:get-access-token="getAccessToken"
				:busy="isBusy"
				@load="loadScenario"
			/>

			<SessionHistoryView
				v-else
				:locale="locale"
				:history="history"
				:busy="isBusy"
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
