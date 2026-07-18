<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

import { adminTranslations } from '../adminLocales';
import { translations, type Locale } from '../locales';
import {
	currentSessionState,
	type SessionCommand,
	type SessionMode,
	type SessionStatus,
} from '../services/sessionStateMachine';
import AppButton from './AppButton.vue';
import EyebrowLabel from './EyebrowLabel.vue';
import FormField from './FormField.vue';

type GuestStatus = 'registered' | 'waiting' | 'served' | 'not_placed' | 'no_show';
type Question = { id?: string; prompt: string; type: 'text' | 'scale'; required: boolean };
type MarketEvent = {
	id: string;
	registrationOpensAt: string;
	registrationClosesAt: string;
	capacity: number;
	sessionMode: SessionMode;
	status: SessionStatus;
};
type AdminView = 'current-session' | 'question-bank' | 'guest-database' | 'session-history';
type HistoricalEvent = MarketEvent & { guestCount: number };
type Guest = {
	id: string;
	marketEventId: string | null;
	firstName: string;
	lastName: string;
	phone: string;
	householdSize: number;
	status: GuestStatus;
};
type Overview = {
	event: MarketEvent | null;
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
const event = ref<MarketEvent | null>(null);
const counts = ref<Overview['counts']>({});
const questions = ref<Question[]>([]);
const guests = ref<Guest[]>([]);
const sessionGuests = ref<Guest[]>([]);
const history = ref<HistoricalEvent[]>([]);
const searchQuery = ref('');
const feedback = ref('');
const isBusy = ref(false);
const showManualGuest = ref(false);
const settings = reactive({
	sessionMode: 'scheduled' as SessionMode,
	registrationOpensAt: '',
	adHocClosesAt: '',
	durationMinutes: 60,
	capacity: 50,
});
const extensionMinutes = ref(30);
const postponementMinutes = ref(30);
let sessionRefreshTimer: ReturnType<typeof setTimeout> | undefined;
const manualGuest = reactive({
	firstName: '',
	lastName: '',
	age: '' as string | number,
	householdSize: 1 as string | number,
	phone: '',
});

const statuses: GuestStatus[] = ['waiting', 'served', 'registered', 'not_placed', 'no_show'];
const statusLabels = computed<Record<GuestStatus, string>>(() => ({
	waiting: t.value.waiting,
	served: t.value.served,
	registered: t.value.registered,
	not_placed: t.value.notPlaced,
	no_show: t.value.noShow,
}));
const navigation = computed<{ id: AdminView; label: string }[]>(() => [
	{ id: 'current-session', label: t.value.currentSession },
	{ id: 'question-bank', label: t.value.questionBank },
	{ id: 'guest-database', label: t.value.guestDatabase },
	{ id: 'session-history', label: t.value.historySessions },
]);
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
const currentSessionGuests = computed(() =>
	sessionGuests.value.filter((guest) => guest.marketEventId === event.value?.id),
);
const registeredSessionGuests = computed(() =>
	currentSessionGuests.value.filter((guest) => guest.status === 'registered'),
);

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
	settings.sessionMode = 'scheduled';
	settings.registrationOpensAt = toLocalDateTime(opens);
	settings.adHocClosesAt = toLocalDateTime(closes);
	settings.durationMinutes = 60;
}

function registrationClosesAt() {
	if (settings.sessionMode === 'ad_hoc') {
		return new Date(settings.adHocClosesAt).toISOString();
	}

	return new Date(
		new Date(settings.registrationOpensAt).valueOf() + settings.durationMinutes * 60_000,
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
		settings.sessionMode = data.event.sessionMode ?? 'scheduled';
		settings.registrationOpensAt = toLocalDateTime(data.event.registrationOpensAt);
		settings.adHocClosesAt = toLocalDateTime(data.event.registrationClosesAt);
		settings.durationMinutes = Math.max(
			1,
			Math.round(
				(new Date(data.event.registrationClosesAt).valueOf() -
					new Date(data.event.registrationOpensAt).valueOf()) /
					60_000,
			),
		);
		settings.capacity = data.event.capacity;
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
		}
	} else {
		settings.capacity = 50;
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

function formatEventDate(value: string) {
	return new Intl.DateTimeFormat(props.locale, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(value));
}

async function loadDashboard() {
	try {
		await loadOverview();
		await Promise.all([loadGuests(), loadSessionGuests(), loadHistory()]);
	} catch {
		feedback.value = t.value.error;
	}
}

function addQuestion() {
	questions.value.push({ prompt: '', type: 'text', required: false });
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
					settings.sessionMode === 'ad_hoc'
						? new Date().toISOString()
						: new Date(settings.registrationOpensAt).toISOString(),
				registrationClosesAt: registrationClosesAt(),
				capacity: settings.capacity,
				sessionMode: settings.sessionMode,
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
		close_session: t.value.confirmCloseSession,
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
		settings.sessionMode === 'scheduled' ? 'schedule_registration' : 'open_registration';
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
	await updateRegistrationOverrides(event.value.registrationClosesAt, settings.capacity);
}

async function updateGuestStatus(guest: Guest, status: GuestStatus) {
	const previous = guest.status;
	guest.status = status;
	try {
		const response = await fetch('/api/guests', {
			method: 'PATCH',
			headers: await authHeaders(true),
			body: JSON.stringify({ id: guest.id, status }),
		});
		if (!response.ok) {
			throw new Error('status');
		}
		await Promise.all([loadOverview(), loadSessionGuests()]);
	} catch {
		guest.status = previous;
		feedback.value = t.value.error;
	}
}

async function addManualGuest() {
	isBusy.value = true;
	feedback.value = '';
	try {
		const response = await fetch('/api/guests', {
			method: 'POST',
			headers: await authHeaders(true),
			body: JSON.stringify({
				...manualGuest,
				locale: props.locale,
				marketEventId: event.value?.id ?? null,
				answers: {},
				source: 'admin',
			}),
		});
		if (!response.ok) {
			throw new Error('guest');
		}
		Object.assign(manualGuest, {
			firstName: '',
			lastName: '',
			age: '',
			householdSize: 1,
			phone: '',
		});
		showManualGuest.value = false;
		await loadOverview();
		await Promise.all([loadGuests(), loadSessionGuests()]);
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
	<section class="admin-dashboard">
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

		<div class="admin-content">
			<header class="admin-heading">
				<div>
					<EyebrowLabel tone="brand">{{ base.adminEyebrow }}</EyebrowLabel>
					<h1>{{ navigation.find((item) => item.id === activeView)?.label }}</h1>
					<p>{{ t.adminDescription }}</p>
				</div>
				<span v-if="activeView === 'current-session'" class="event-state" :class="sessionState">
					{{ sessionStatusLabel }}
				</span>
			</header>

			<p v-if="feedback" class="admin-feedback" role="status">{{ feedback }}</p>

			<template v-if="activeView === 'current-session'">
				<section v-if="sessionState === 'service_started'" class="admin-section">
					<h2>{{ t.overview }}</h2>
					<div class="stat-grid">
						<article v-for="status in statuses" :key="status" class="stat-card">
							<strong>{{ counts[status] ?? 0 }}</strong>
							<span>{{ statusLabels[status] }}</span>
						</article>
					</div>
				</section>

				<section v-if="sessionState === 'inactive'" class="admin-section settings-card">
					<h2>{{ t.registrationSettings }}</h2>
					<p>{{ t.startSessionHelp }}</p>
					<form @submit.prevent="saveSettings">
						<label
							><span>{{ t.sessionType }}</span
							><select v-model="settings.sessionMode">
								<option value="scheduled">{{ t.scheduledSession }}</option>
								<option value="ad_hoc">{{ t.adHocSession }}</option>
							</select></label
						>
						<p class="mode-help">
							{{
								settings.sessionMode === 'scheduled' ? t.scheduledSessionHelp : t.adHocSessionHelp
							}}
						</p>
						<div v-if="settings.sessionMode === 'scheduled'" class="field-row">
							<label
								><span>{{ t.opensAt }}</span
								><input v-model="settings.registrationOpensAt" type="datetime-local" required
							/></label>
							<label
								><span>{{ t.registrationDurationMinutes }}</span
								><input
									v-model.number="settings.durationMinutes"
									type="number"
									min="1"
									max="1440"
									step="1"
									list="registration-duration-options"
									required
							/></label>
						</div>
						<datalist id="registration-duration-options">
							<option value="30"></option>
							<option value="60"></option>
							<option value="90"></option>
							<option value="120"></option>
						</datalist>
						<label v-if="settings.sessionMode === 'ad_hoc'"
							><span>{{ t.closesAt }}</span
							><input v-model="settings.adHocClosesAt" type="datetime-local" required
						/></label>
						<label
							><span>{{ t.capacity }}</span
							><input v-model.number="settings.capacity" type="number" min="1" max="10000" required
						/></label>
						<div class="form-actions">
							<AppButton type="submit" variant="secondary" :disabled="isBusy">
								{{ t.saveSettings }}
							</AppButton>
							<AppButton type="button" :disabled="isBusy" @click="saveAndStartRegistration">
								{{
									settings.sessionMode === 'scheduled' ? t.scheduleRegistration : t.openRegistration
								}}
							</AppButton>
						</div>
					</form>
				</section>

				<section v-else-if="sessionState === 'scheduled'" class="admin-section settings-card">
					<h2>{{ t.scheduled }}</h2>
					<p>{{ t.scheduledFor }} {{ formatEventDate(event!.registrationOpensAt) }}</p>
					<div class="override-grid">
						<form @submit.prevent="postponeRegistration">
							<label
								><span>{{ t.postponeByMinutes }}</span
								><input
									v-model.number="postponementMinutes"
									type="number"
									min="1"
									max="1440"
									step="1"
									required
							/></label>
							<AppButton type="submit" variant="secondary" :disabled="isBusy">
								{{ t.postponeRegistration }}
							</AppButton>
						</form>
					</div>
					<div class="standalone-action">
						<AppButton
							type="button"
							:disabled="isBusy"
							@click="runMarketAction('open_registration')"
						>
							{{ t.openRegistrationNow }}
						</AppButton>
					</div>
				</section>

				<section
					v-else-if="sessionState === 'registration_open'"
					class="admin-section settings-card"
				>
					<h2>{{ t.registrationOverrides }}</h2>
					<p>{{ t.overridesHelp }}</p>
					<div class="override-grid">
						<form @submit.prevent="extendRegistration">
							<label
								><span>{{ t.extendRegistrationMinutes }}</span
								><input
									v-model.number="extensionMinutes"
									type="number"
									min="1"
									max="1440"
									step="1"
									list="registration-extension-options"
									required
							/></label>
							<datalist id="registration-extension-options">
								<option value="15"></option>
								<option value="30"></option>
								<option value="60"></option>
							</datalist>
							<AppButton type="submit" variant="secondary" :disabled="isBusy">
								{{ t.extendRegistration }}
							</AppButton>
						</form>
						<form @submit.prevent="saveCapacityOverride">
							<label
								><span>{{ t.capacity }}</span
								><input
									v-model.number="settings.capacity"
									type="number"
									min="1"
									max="10000"
									required
							/></label>
							<AppButton type="submit" variant="secondary" :disabled="isBusy">
								{{ t.updateCapacity }}
							</AppButton>
						</form>
					</div>
					<div class="standalone-action">
						<AppButton
							type="button"
							:disabled="isBusy"
							@click="runMarketAction('close_registration')"
						>
							{{ t.closeRegistration }}
						</AppButton>
					</div>
				</section>

				<section
					v-else-if="sessionState === 'registration_closed'"
					class="admin-section action-card"
				>
					<div>
						<h2>{{ t.lotteryActions }}</h2>
						<p>{{ t.closed }}</p>
					</div>
					<div class="action-buttons">
						<AppButton
							type="button"
							variant="secondary"
							:disabled="isBusy"
							@click="runMarketAction('reopen_registration')"
							>{{ t.reopenRegistration }}</AppButton
						>
						<AppButton type="button" :disabled="isBusy" @click="runMarketAction('run_lottery')">{{
							t.runLottery
						}}</AppButton>
					</div>
				</section>

				<section v-else class="admin-section guest-section">
					<div class="section-heading">
						<div>
							<h2>{{ t.guestList }}</h2>
							<p>{{ t.serviceStarted }}</p>
						</div>
						<button class="add-guest-button" type="button" @click="showManualGuest = true">
							+ {{ t.addGuest }}
						</button>
					</div>
					<form v-if="showManualGuest" class="manual-form" @submit.prevent="addManualGuest">
						<h3>{{ t.manualGuestTitle }}</h3>
						<FormField v-model="manualGuest.firstName" :label="base.firstName" required />
						<FormField v-model="manualGuest.lastName" :label="base.lastName" required />
						<div class="field-row">
							<FormField
								v-model="manualGuest.age"
								:label="base.age"
								type="number"
								:min="0"
								:max="120"
								required
							/><FormField
								v-model="manualGuest.householdSize"
								:label="base.household"
								type="number"
								:min="1"
								:max="30"
								required
							/>
						</div>
						<FormField v-model="manualGuest.phone" :label="base.phone" type="tel" required />
						<div class="manual-actions">
							<button type="button" @click="showManualGuest = false">{{ t.cancel }}</button
							><AppButton type="submit" :disabled="isBusy">{{ t.saveGuest }}</AppButton>
						</div>
					</form>
					<div v-if="currentSessionGuests.length" class="guest-list">
						<article v-for="guest in currentSessionGuests" :key="guest.id" class="guest-row">
							<div>
								<strong>{{ guest.firstName }} {{ guest.lastName }}</strong
								><span>{{ guest.phone }} · {{ base.household }}: {{ guest.householdSize }}</span>
							</div>
							<label
								><span class="sr-only">{{ t.status }}</span
								><select
									:value="guest.status"
									@change="
										updateGuestStatus(
											guest,
											($event.target as HTMLSelectElement).value as GuestStatus,
										)
									"
								>
									<option v-for="status in statuses" :key="status" :value="status">
										{{ statusLabels[status] }}
									</option>
								</select></label
							>
						</article>
					</div>
					<p v-else class="empty-state">{{ t.noGuests }}</p>
					<div class="standalone-action">
						<AppButton type="button" :disabled="isBusy" @click="runMarketAction('close_session')">
							{{ t.closeSession }}
						</AppButton>
					</div>
				</section>

				<section
					v-if="
						event &&
						(sessionState === 'registration_open' || sessionState === 'registration_closed')
					"
					class="admin-section guest-section registered-section"
				>
					<div class="section-heading">
						<h2>{{ t.registeredGuests }}</h2>
						<span class="session-count">{{ registeredSessionGuests.length }}</span>
					</div>
					<div v-if="registeredSessionGuests.length" class="guest-list">
						<article v-for="guest in registeredSessionGuests" :key="guest.id" class="guest-row">
							<div>
								<strong>{{ guest.firstName }} {{ guest.lastName }}</strong>
								<span>{{ guest.phone }} · {{ base.household }}: {{ guest.householdSize }}</span>
							</div>
						</article>
					</div>
					<p v-else class="empty-state">{{ t.noRegisteredGuests }}</p>
				</section>

				<section v-if="event" class="admin-section reset-card">
					<div>
						<h2>{{ t.resetSession }}</h2>
						<p>{{ t.resetSessionHelp }}</p>
					</div>
					<AppButton
						type="button"
						variant="secondary"
						:disabled="isBusy"
						@click="runMarketAction('reset_session')"
					>
						{{ t.resetSession }}
					</AppButton>
				</section>
			</template>

			<section v-else-if="activeView === 'question-bank'" class="admin-section settings-card">
				<div class="questions-heading">
					<h2>{{ t.questions }}</h2>
					<button type="button" @click="addQuestion">+ {{ t.addQuestion }}</button>
				</div>
				<form @submit.prevent="saveSettings">
					<div
						v-for="(question, index) in questions"
						:key="question.id ?? index"
						class="question-row"
					>
						<input v-model.trim="question.prompt" :placeholder="t.questionPlaceholder" required />
						<select v-model="question.type">
							<option value="text">{{ t.textAnswer }}</option>
							<option value="scale">{{ t.scaleAnswer }}</option>
						</select>
						<label class="check-label"
							><input v-model="question.required" type="checkbox" /> {{ t.required }}</label
						>
						<button class="remove-button" type="button" @click="questions.splice(index, 1)">
							{{ t.remove }}
						</button>
					</div>
					<AppButton
						type="submit"
						:disabled="isBusy || (event !== null && event.status !== 'draft')"
						>{{ t.saveSettings }}</AppButton
					>
				</form>
			</section>

			<section v-else-if="activeView === 'guest-database'" class="admin-section guest-section">
				<div class="section-heading">
					<h2>{{ t.allGuests }}</h2>
					<button
						class="add-guest-button"
						type="button"
						:disabled="event?.status !== 'service_started'"
						@click="showManualGuest = true"
					>
						+ {{ t.addGuest }}
					</button>
				</div>
				<form class="search-form" @submit.prevent="loadGuests">
					<input
						v-model="searchQuery"
						type="search"
						:placeholder="t.searchPlaceholder"
						:aria-label="t.searchPlaceholder"
					/><button type="submit">{{ t.search }}</button>
				</form>
				<form v-if="showManualGuest" class="manual-form" @submit.prevent="addManualGuest">
					<h3>{{ t.manualGuestTitle }}</h3>
					<FormField v-model="manualGuest.firstName" :label="base.firstName" required />
					<FormField v-model="manualGuest.lastName" :label="base.lastName" required />
					<div class="field-row">
						<FormField
							v-model="manualGuest.age"
							:label="base.age"
							type="number"
							:min="0"
							:max="120"
							required
						/><FormField
							v-model="manualGuest.householdSize"
							:label="base.household"
							type="number"
							:min="1"
							:max="30"
							required
						/>
					</div>
					<FormField v-model="manualGuest.phone" :label="base.phone" type="tel" required />
					<div class="manual-actions">
						<button type="button" @click="showManualGuest = false">{{ t.cancel }}</button
						><AppButton type="submit" :disabled="isBusy">{{ t.saveGuest }}</AppButton>
					</div>
				</form>
				<div v-if="guests.length" class="guest-list">
					<article v-for="guest in guests" :key="guest.id" class="guest-row">
						<div>
							<strong>{{ guest.firstName }} {{ guest.lastName }}</strong
							><span>{{ guest.phone }} · {{ base.household }}: {{ guest.householdSize }}</span>
						</div>
						<label
							><span class="sr-only">{{ t.status }}</span
							><select
								:value="guest.status"
								@change="
									updateGuestStatus(
										guest,
										($event.target as HTMLSelectElement).value as GuestStatus,
									)
								"
							>
								<option v-for="status in statuses" :key="status" :value="status">
									{{ statusLabels[status] }}
								</option>
							</select></label
						>
					</article>
				</div>
				<p v-else class="empty-state">{{ t.noGuests }}</p>
			</section>

			<section v-else class="admin-section history-section">
				<div v-if="history.length" class="history-list">
					<article v-for="pastEvent in history" :key="pastEvent.id" class="history-row">
						<div>
							<strong>{{ formatEventDate(pastEvent.registrationOpensAt) }}</strong
							><span>{{ formatEventDate(pastEvent.registrationClosesAt) }}</span>
						</div>
						<div>
							<strong>{{ pastEvent.guestCount }}</strong
							><span>{{ t.sessionGuests }}</span>
						</div>
						<span class="event-state ended">{{ t.closeSession }}</span>
					</article>
				</div>
				<p v-else class="empty-state">{{ t.noHistory }}</p>
			</section>
		</div>
	</section>
</template>

<style scoped>
.admin-dashboard {
	width: min(100% - 32px, 1180px);
	margin: 0 auto;
	padding: 30px 0 60px;
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
.admin-heading p,
.section-heading p,
.settings-card > p,
.action-card p {
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
.admin-feedback {
	margin-bottom: 16px;
	padding: 12px 14px;
	border-radius: var(--radius-sm);
	background: #eef5f3;
	color: var(--color-brand);
}
.admin-section {
	margin-bottom: 20px;
}
.admin-section h2 {
	font-family: var(--font-heading);
	font-size: 23px;
	text-transform: uppercase;
}
.stat-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 10px;
	margin-top: 14px;
}
.stat-card {
	display: grid;
	gap: 2px;
	min-height: 92px;
	padding: 15px;
	border-radius: var(--radius-md);
	color: white;
	background: var(--color-brand);
}
.stat-card:first-child {
	grid-column: span 2;
}
.stat-card strong {
	font-family: var(--font-heading);
	font-size: 32px;
}
.stat-card span {
	font-size: 13px;
}
.settings-card,
.action-card,
.guest-section,
.reset-card {
	padding: 20px;
	border: 1.5px solid #c7d2cc;
	border-radius: var(--radius-lg);
}
.reset-card {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	align-items: center;
	gap: 16px;
}
.reset-card p {
	max-width: 560px;
	color: var(--color-text-subtle);
	line-height: 1.5;
}
.reset-card :deep(.app-button.secondary) {
	color: var(--color-error);
	box-shadow: inset 0 0 0 1.5px var(--color-error);
}
.reset-card :deep(.app-button.secondary:hover:not(:disabled)) {
	color: white;
	background: var(--color-error);
}
.section-heading,
.questions-heading,
.action-card,
.guest-row,
.manual-actions {
	display: flex;
	justify-content: space-between;
	gap: 14px;
	align-items: center;
}
form {
	display: grid;
	gap: 15px;
	margin-top: 18px;
}
label {
	display: grid;
	gap: 7px;
	font-family: var(--font-heading);
	font-size: 14px;
	font-weight: 700;
}
input,
select {
	width: 100%;
	min-height: 50px;
	padding: 0 13px;
	border: 1.5px solid var(--color-border);
	border-radius: 12px;
	background: white;
	color: var(--color-text);
}
.field-row {
	display: grid;
	grid-template-columns: 1fr;
	gap: 12px;
}
.questions-heading {
	margin-top: 5px;
}
.questions-heading h3,
.manual-form h3 {
	margin: 0;
	font-family: var(--font-heading);
	text-transform: uppercase;
}
.questions-heading button,
.add-guest-button,
.remove-button {
	border: 0;
	color: var(--color-brand);
	background: transparent;
	font-weight: 700;
}
.question-row {
	display: grid;
	gap: 8px;
	padding: 12px;
	border-radius: var(--radius-md);
	background: #f3f6f4;
}
.question-row .check-label {
	display: flex;
	align-items: center;
}
.check-label input {
	width: 20px;
	min-height: 20px;
}
.remove-button {
	justify-self: start;
	color: var(--color-error);
	padding: 5px 0;
}
.action-card {
	align-items: flex-start;
}
.action-buttons {
	display: grid;
	gap: 10px;
	width: 100%;
}
.standalone-action {
	display: flex;
	justify-content: flex-end;
	margin-top: 18px;
	padding-top: 18px;
	border-top: 1px solid #dce3df;
}
.form-actions {
	display: grid;
	gap: 10px;
}
.override-grid {
	display: grid;
	gap: 18px;
}
.override-grid form {
	margin-top: 0;
	padding: 16px;
	border-radius: var(--radius-md);
	background: #f3f6f4;
}
.mode-help {
	margin: -6px 0 0;
	color: var(--color-text-subtle);
	font-size: 14px;
	line-height: 1.5;
}
.search-form {
	display: grid;
	grid-template-columns: 1fr auto;
	gap: 8px;
}
.search-form button {
	padding: 0 17px;
	border: 0;
	border-radius: 12px;
	color: white;
	background: var(--color-brand);
	font-weight: 700;
}
.manual-form {
	padding: 18px;
	border-radius: var(--radius-md);
	background: #f3f6f4;
}
.manual-actions > button:first-child {
	border: 0;
	color: var(--color-brand);
	background: transparent;
	font-weight: 700;
}
.guest-list {
	display: grid;
	margin-top: 18px;
}
.session-count {
	display: grid;
	place-items: center;
	min-width: 38px;
	height: 38px;
	padding: 0 10px;
	border-radius: var(--radius-pill);
	color: var(--color-on-brand);
	background: var(--color-brand);
	font-family: var(--font-heading);
	font-weight: 700;
}
.history-list {
	display: grid;
	gap: 12px;
}
.history-row {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 14px;
	align-items: center;
	padding: 18px;
	border: 1.5px solid #c7d2cc;
	border-radius: var(--radius-md);
}
.history-row > div {
	display: grid;
	gap: 4px;
}
.history-row > div:nth-child(2) {
	text-align: end;
}
.history-row span:not(.event-state) {
	color: var(--color-text-subtle);
	font-size: 13px;
}
.history-row .event-state {
	grid-column: 1 / -1;
	justify-self: start;
}
.guest-row {
	padding: 14px 0;
	border-top: 1px solid #dce3df;
}
.guest-row > div {
	display: grid;
	gap: 4px;
	min-width: 0;
}
.guest-row span {
	color: var(--color-text-subtle);
	font-size: 12px;
}
.guest-row label {
	flex: 0 0 130px;
}
.guest-row select {
	min-height: 42px;
	font-size: 13px;
}
.empty-state {
	padding: 30px 0 10px;
	text-align: center;
	color: var(--color-text-subtle);
}
@media (min-width: 560px) {
	.stat-grid {
		grid-template-columns: repeat(5, 1fr);
	}
	.stat-card:first-child {
		grid-column: auto;
	}
	.field-row {
		grid-template-columns: 1fr 1fr;
	}
	.question-row {
		grid-template-columns: minmax(0, 2fr) 1fr auto auto;
		align-items: center;
	}
	.action-buttons {
		width: auto;
	}
	.form-actions {
		grid-template-columns: auto auto;
		justify-content: end;
	}
	.override-grid {
		grid-template-columns: 1fr 1fr;
	}
	.action-card {
		align-items: center;
	}
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
	.history-row {
		grid-template-columns: minmax(0, 1fr) auto auto;
	}
	.history-row .event-state {
		grid-column: auto;
		justify-self: end;
	}
}
</style>
