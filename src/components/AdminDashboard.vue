<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';

import { adminTranslations } from '../adminLocales';
import { translations, type Locale } from '../locales';
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
	status: 'open' | 'closed' | 'drawn';
};
type Guest = {
	id: string;
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

const props = defineProps<{ locale: Locale; getAccessToken: () => Promise<string> }>();
const t = computed(() => adminTranslations[props.locale]);
const base = computed(() => translations[props.locale]);
const event = ref<MarketEvent | null>(null);
const counts = ref<Overview['counts']>({});
const questions = ref<Question[]>([]);
const guests = ref<Guest[]>([]);
const searchQuery = ref('');
const feedback = ref('');
const isBusy = ref(false);
const showManualGuest = ref(false);
const settings = reactive({ registrationOpensAt: '', registrationClosesAt: '', capacity: 50 });
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
	const opens = new Date();
	opens.setMinutes(Math.ceil(opens.getMinutes() / 15) * 15, 0, 0);
	const closes = new Date(opens.valueOf() + 2 * 60 * 60 * 1000);
	settings.registrationOpensAt = toLocalDateTime(opens);
	settings.registrationClosesAt = toLocalDateTime(closes);
}

function applyOverview(data: Overview) {
	event.value = data.event;
	counts.value = data.counts;
	questions.value = data.questions.map(({ id, prompt, type, required }) => ({
		id,
		prompt,
		type,
		required,
	}));
	if (data.event) {
		settings.registrationOpensAt = toLocalDateTime(data.event.registrationOpensAt);
		settings.registrationClosesAt = toLocalDateTime(data.event.registrationClosesAt);
		settings.capacity = data.event.capacity;
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
	const params = new URLSearchParams();
	if (searchQuery.value.trim()) {
		params.set('q', searchQuery.value.trim());
	}
	const response = await fetch(`/api/guests?${params}`, { headers: await authHeaders() });
	if (!response.ok) {
		throw new Error('guests');
	}
	guests.value = (await response.json()) as Guest[];
}

async function loadDashboard() {
	try {
		await Promise.all([loadOverview(), loadGuests()]);
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
				registrationOpensAt: new Date(settings.registrationOpensAt).toISOString(),
				registrationClosesAt: new Date(settings.registrationClosesAt).toISOString(),
				capacity: settings.capacity,
				questions: questions.value,
			}),
		});
		if (!response.ok) {
			throw new Error('save');
		}
		applyOverview((await response.json()) as Overview);
		feedback.value = t.value.saved;
	} catch {
		feedback.value = t.value.error;
	} finally {
		isBusy.value = false;
	}
}

async function runMarketAction(action: 'close' | 'draw') {
	if (action === 'draw' && !window.confirm(t.value.runLottery)) {
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
		await loadGuests();
		feedback.value = action === 'draw' ? t.value.drawComplete : t.value.closed;
	} catch {
		feedback.value = t.value.error;
	} finally {
		isBusy.value = false;
	}
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
		await loadOverview();
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
		await Promise.all([loadOverview(), loadGuests()]);
	} catch {
		feedback.value = t.value.error;
	} finally {
		isBusy.value = false;
	}
}

setDefaultSettings();
onMounted(loadDashboard);
</script>

<template>
	<section class="admin-dashboard">
		<header class="admin-heading">
			<div>
				<EyebrowLabel tone="brand">{{ base.adminEyebrow }}</EyebrowLabel>
				<h1>{{ t.adminTitle }}</h1>
				<p>{{ t.adminDescription }}</p>
			</div>
			<span v-if="event" class="event-state" :class="event.status">
				{{ event.status === 'drawn' ? t.drawn : event.status === 'closed' ? t.closed : t.open }}
			</span>
		</header>

		<p v-if="feedback" class="admin-feedback" role="status">{{ feedback }}</p>

		<section class="admin-section">
			<h2>{{ t.overview }}</h2>
			<div class="stat-grid">
				<article v-for="status in statuses" :key="status" class="stat-card">
					<strong>{{ counts[status] ?? 0 }}</strong>
					<span>{{ statusLabels[status] }}</span>
				</article>
			</div>
		</section>

		<section class="admin-section settings-card">
			<div class="section-heading">
				<div>
					<h2>{{ t.registrationSettings }}</h2>
					<p>{{ t.settingsHelp }}</p>
				</div>
			</div>
			<form @submit.prevent="saveSettings">
				<div class="field-row">
					<label
						><span>{{ t.opensAt }}</span
						><input v-model="settings.registrationOpensAt" type="datetime-local" required
					/></label>
					<label
						><span>{{ t.closesAt }}</span
						><input v-model="settings.registrationClosesAt" type="datetime-local" required
					/></label>
				</div>
				<label
					><span>{{ t.capacity }}</span
					><input v-model.number="settings.capacity" type="number" min="1" max="10000" required
				/></label>
				<div class="questions-heading">
					<h3>{{ t.questions }}</h3>
					<button type="button" @click="addQuestion">+ {{ t.addQuestion }}</button>
				</div>
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
				<AppButton type="submit" :disabled="isBusy">{{ t.saveSettings }}</AppButton>
			</form>
		</section>

		<section class="admin-section action-card">
			<div>
				<h2>{{ t.lotteryActions }}</h2>
				<p>{{ t.settingsHelp }}</p>
			</div>
			<div class="action-buttons">
				<AppButton
					v-if="event?.status === 'open'"
					type="button"
					variant="secondary"
					:disabled="isBusy"
					@click="runMarketAction('close')"
					>{{ t.closeRegistration }}</AppButton
				>
				<AppButton
					v-if="event && event.status !== 'drawn'"
					type="button"
					:disabled="isBusy"
					@click="runMarketAction('draw')"
					>{{ t.runLottery }}</AppButton
				>
			</div>
		</section>

		<section class="admin-section guest-section">
			<div class="section-heading">
				<h2>{{ t.guestList }}</h2>
				<button
					class="add-guest-button"
					type="button"
					:disabled="!event"
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
								updateGuestStatus(guest, ($event.target as HTMLSelectElement).value as GuestStatus)
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
	</section>
</template>

<style scoped>
.admin-dashboard {
	width: min(100% - 32px, 760px);
	margin: 0 auto;
	padding: 30px 0 60px;
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
.event-state.closed {
	background: #fff1d8;
	color: #7a4b00;
}
.event-state.drawn {
	background: #e9e7f9;
	color: #39306b;
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
.guest-section {
	padding: 20px;
	border: 1.5px solid #c7d2cc;
	border-radius: var(--radius-lg);
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
	.action-card {
		align-items: center;
	}
}
</style>
