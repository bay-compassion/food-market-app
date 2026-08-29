<script setup lang="ts">
import { computed } from 'vue';

import { AppButton } from '@/react-bridge/islands.ts';

import { adminTranslations } from '../../adminLocales';
import type { Locale } from '../../locales';
import type { GuestAdmission } from '../../services/guestAdmission';
import type { CurrentSessionState, SessionCommand } from '../../services/sessionStateMachine';
import type { VisitStatus } from '../../services/visitStateMachine';
import AddGuestSection from './AddGuestSection.vue';
import SessionBroadcastForm from './SessionBroadcastForm.vue';
import SessionGuestList from './SessionGuestList.vue';
import SessionSettingsForm from './SessionSettingsForm.vue';
import type { AdminMarketEvent, ManualGuest, QueueGuest, SessionSettings } from './types';

const props = defineProps<{
	locale: Locale;
	event: AdminMarketEvent | null;
	sessionState: CurrentSessionState;
	statuses: VisitStatus[];
	counts: Partial<Record<VisitStatus, number>>;
	statusLabels: Record<VisitStatus, string>;
	registeredGuests: QueueGuest[];
	admissions: GuestAdmission[];
	busy?: boolean;
}>();
const emit = defineEmits<{
	saveSettings: [];
	saveAndStartRegistration: [];
	postponeRegistration: [];
	extendRegistration: [];
	saveCapacityOverride: [];
	run: [action: SessionCommand];
	addGuest: [guest: ManualGuest];
	sendBroadcast: [];
	navigateQueue: [];
}>();

const settings = defineModel<SessionSettings>('settings', { required: true });
const extensionMinutes = defineModel<number>('extensionMinutes', { required: true });
const postponementMinutes = defineModel<number>('postponementMinutes', { required: true });
const broadcast = defineModel<{ title: string; body: string }>('broadcast', { required: true });

const t = computed(() => adminTranslations.en);
const showsRegisteredGuests = computed(
	() =>
		!!props.event &&
		(props.sessionState === 'registration_open' || props.sessionState === 'registration_closed'),
);
const showsBroadcast = computed(
	() =>
		!!props.event &&
		['registration_open', 'registration_closed', 'service_started'].includes(props.sessionState),
);

function formatEventDate(value: string) {
	return new Intl.DateTimeFormat(props.locale, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(value));
}
</script>

<template>
	<section v-if="sessionState === 'service_started'" class="admin-section">
		<h2>{{ t.overview }}</h2>
		<div class="stat-grid">
			<article v-for="status in statuses" :key="status" class="stat-card">
				<strong>{{ counts[status] ?? 0 }}</strong>
				<span>{{ statusLabels[status] }}</span>
			</article>
		</div>
	</section>

	<SessionSettingsForm
		v-if="sessionState === 'inactive'"
		v-model="settings"
		:locale="locale"
		:busy="busy"
		@save="emit('saveSettings')"
		@save-and-start="emit('saveAndStartRegistration')"
	/>

	<section v-else-if="sessionState === 'scheduled'" class="admin-section settings-card">
		<h2>{{ t.scheduled }}</h2>
		<p>{{ t.scheduledFor }} {{ formatEventDate(event!.registrationOpensAt) }}</p>
		<div class="override-grid">
			<form @submit.prevent="emit('postponeRegistration')">
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
				<AppButton
					type="submit"
					variant="secondary"
					:disabled="busy"
					:label="t.postponeRegistration"
				/>
			</form>
		</div>
		<div class="standalone-action">
			<AppButton
				type="button"
				:disabled="busy"
				@click="emit('run', 'open_registration')"
				:label="t.openRegistrationNow"
			/>
		</div>
	</section>

	<section v-else-if="sessionState === 'registration_open'" class="admin-section settings-card">
		<h2>{{ t.registrationOverrides }}</h2>
		<p>{{ t.overridesHelp }}</p>
		<div class="override-grid">
			<form @submit.prevent="emit('extendRegistration')">
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
				<AppButton
					type="submit"
					variant="secondary"
					:disabled="busy"
					:label="t.extendRegistration"
				/>
			</form>
			<form @submit.prevent="emit('saveCapacityOverride')">
				<label
					><span>{{ t.capacity }}</span
					><input v-model.number="settings.capacity" type="number" min="1" max="10000" required
				/></label>
				<AppButton type="submit" variant="secondary" :disabled="busy" :label="t.updateCapacity" />
			</form>
		</div>
		<div class="standalone-action">
			<AppButton
				type="button"
				:disabled="busy"
				@click="emit('run', 'close_registration')"
				:label="t.closeRegistration"
			/>
		</div>
	</section>

	<section v-else-if="sessionState === 'registration_closed'" class="admin-section action-card">
		<div>
			<h2>{{ t.lotteryActions }}</h2>
			<p>{{ t.closed }}</p>
		</div>
		<div class="action-buttons">
			<AppButton
				type="button"
				variant="secondary"
				:disabled="busy"
				@click="emit('run', 'reopen_registration')"
				:label="t.reopenRegistration"
			/>
			<AppButton
				type="button"
				:disabled="busy"
				@click="emit('run', 'run_lottery')"
				:label="t.runLottery"
			/>
		</div>
	</section>

	<section v-else class="admin-section action-card">
		<div>
			<h2>{{ t.serviceStarted }}</h2>
			<p>{{ t.guestList }}</p>
		</div>
		<div class="action-buttons">
			<AppButton type="button" @click="emit('navigateQueue')" :label="t.goToQueue" />
		</div>
	</section>

	<SessionGuestList v-if="showsRegisteredGuests" :locale="locale" :guests="registeredGuests" />

	<!-- A worker can add someone by hand at any stage; only what "adding" means changes. -->
	<AddGuestSection
		:locale="locale"
		:admissions="admissions"
		:busy="busy"
		@add-guest="emit('addGuest', $event)"
	/>

	<SessionBroadcastForm
		v-if="showsBroadcast"
		v-model="broadcast"
		:locale="locale"
		:busy="busy"
		@send="emit('sendBroadcast')"
	/>

	<section v-if="event" class="admin-section reset-card">
		<div>
			<h2>{{ t.resetSession }}</h2>
			<p>{{ t.resetSessionHelp }}</p>
		</div>
		<AppButton
			type="button"
			variant="secondary"
			:disabled="busy"
			@click="emit('run', 'reset_session')"
			:label="t.resetSession"
		/>
	</section>
</template>

<style scoped>
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
.action-card {
	display: flex;
	justify-content: space-between;
	gap: 14px;
	align-items: flex-start;
}
.action-buttons {
	display: grid;
	gap: 10px;
	width: 100%;
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
.standalone-action {
	display: flex;
	justify-content: flex-end;
	margin-top: 18px;
	padding-top: 18px;
	border-top: 1px solid #dce3df;
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
@media (min-width: 560px) {
	.stat-grid {
		grid-template-columns: repeat(5, 1fr);
	}
	.stat-card:first-child {
		grid-column: auto;
	}
	.action-buttons {
		width: auto;
	}
	.override-grid {
		grid-template-columns: 1fr 1fr;
	}
	.action-card {
		align-items: center;
	}
}
</style>
