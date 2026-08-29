<script setup lang="ts">
import { computed } from 'vue';

import { AppButton } from '@/react-bridge/islands.ts';

import { adminTranslations } from '../../adminLocales';
import type { Locale } from '../../locales';
import type { SessionSettings } from './types';

const props = defineProps<{ locale: Locale; busy?: boolean }>();
const emit = defineEmits<{ save: []; saveAndStart: [] }>();
const settings = defineModel<SessionSettings>({ required: true });

const t = computed(() => adminTranslations.en);
</script>

<template>
	<section class="admin-section settings-card">
		<h2>{{ t.registrationSettings }}</h2>
		<p>{{ t.startSessionHelp }}</p>
		<form @submit.prevent="emit('save')">
			<label
				><span>{{ t.sessionType }}</span
				><select v-model="settings.sessionMode">
					<option value="scheduled">{{ t.scheduledSession }}</option>
					<option value="ad_hoc">{{ t.adHocSession }}</option>
				</select></label
			>
			<p class="mode-help">
				{{ settings.sessionMode === 'scheduled' ? t.scheduledSessionHelp : t.adHocSessionHelp }}
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
				<AppButton type="submit" variant="secondary" :disabled="busy" :label="t.saveSettings" />
				<AppButton
					type="button"
					:disabled="busy"
					@click="emit('saveAndStart')"
					:label="
						settings.sessionMode === 'scheduled' ? t.scheduleRegistration : t.openRegistration
					"
				/>
			</div>
		</form>
	</section>
</template>

<style scoped>
.mode-help {
	margin: -6px 0 0;
	color: var(--color-text-subtle);
	font-size: 14px;
	line-height: 1.5;
}
.form-actions {
	display: grid;
	gap: 10px;
}
@media (min-width: 560px) {
	.form-actions {
		grid-template-columns: auto auto;
		justify-content: end;
	}
}
</style>
