<script setup lang="ts">
import { computed, ref } from 'vue';

import { adminTranslations } from '../../adminLocales';
import type { Locale } from '../../locales';
import type { GuestAdmission } from '../../services/guestAdmission';
import ManualGuestForm from './ManualGuestForm.vue';
import type { HistoricalEvent, ManualGuest } from './types';

const props = defineProps<{ locale: Locale; history: HistoricalEvent[]; busy?: boolean }>();
const emit = defineEmits<{ addGuest: [guest: ManualGuest, marketEventId: string] }>();

const t = computed(() => adminTranslations[props.locale]);
const openEventId = ref<string | null>(null);

/** A finished session only accepts an after-the-fact record of someone already served. */
const endedAdmissions: GuestAdmission[] = ['served'];

function formatEventDate(value: string) {
	return new Intl.DateTimeFormat(props.locale, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(value));
}

function addGuest(guest: ManualGuest, marketEventId: string) {
	openEventId.value = null;
	emit('addGuest', guest, marketEventId);
}
</script>

<template>
	<section class="admin-section history-section">
		<div v-if="history.length" class="history-list">
			<div v-for="pastEvent in history" :key="pastEvent.id" class="history-entry">
				<article class="history-row">
					<div>
						<strong>{{ formatEventDate(pastEvent.registrationOpensAt) }}</strong
						><span>{{ formatEventDate(pastEvent.registrationClosesAt) }}</span>
					</div>
					<div>
						<strong>{{ pastEvent.guestCount }}</strong
						><span>{{ t.sessionGuests }}</span>
					</div>
					<span class="event-state ended">{{ t.closeSession }}</span>
					<!-- Records a guest who was served out of band, after this session had ended. -->
					<button
						v-if="openEventId !== pastEvent.id"
						class="add-guest-button"
						type="button"
						@click="openEventId = pastEvent.id"
					>
						+ {{ t.addGuest }}
					</button>
				</article>
				<ManualGuestForm
					v-if="openEventId === pastEvent.id"
					:locale="locale"
					:admissions="endedAdmissions"
					:busy="busy"
					@submit="addGuest($event, pastEvent.id)"
					@cancel="openEventId = null"
				/>
			</div>
		</div>
		<p v-else class="empty-state">{{ t.noHistory }}</p>
	</section>
</template>

<style scoped>
.history-list {
	display: grid;
	gap: 12px;
}
.history-entry {
	display: grid;
	gap: 12px;
	padding: 18px;
	border: 1.5px solid #c7d2cc;
	border-radius: var(--radius-md);
}
.history-row {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 14px;
	align-items: center;
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
.history-row .event-state,
.history-row .add-guest-button {
	grid-column: 1 / -1;
	justify-self: start;
}
.event-state {
	padding: 9px 13px;
	border-radius: var(--radius-pill);
	background: #edf0ee;
	color: var(--color-text-subtle);
	font-size: 13px;
	font-weight: 700;
}
@media (min-width: 860px) {
	.history-row {
		grid-template-columns: minmax(0, 1fr) auto auto;
	}
	.history-row .event-state {
		grid-column: auto;
		justify-self: end;
	}
}
</style>
