<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { type AdminLocale, adminTranslations } from '../../adminLocales';
import type { Locale } from '../../locales';
import type { GuestAdmission } from '../../services/guestAdmission';
import type { VisitCommand, VisitStatus } from '../../services/visitStateMachine';
import AppButton from '../AppButton.vue';
import AddGuestSection from './AddGuestSection.vue';
import QueueCallNext from './QueueCallNext.vue';
import QueueGuestRow from './QueueGuestRow.vue';
import type { ManualGuest, QueueGuest } from './types';

const props = defineProps<{
	locale: AdminLocale;
	guests: QueueGuest[];
	counts: Partial<Record<VisitStatus, number>>;
	statusLabels: Record<VisitStatus, string>;
	serviceStarted: boolean;
	admissions: GuestAdmission[];
	busy?: boolean;
}>();
const emit = defineEmits<{
	callNext: [count: number];
	run: [guest: QueueGuest, command: VisitCommand];
	addGuest: [guest: ManualGuest];
	closeSession: [];
	navigateCurrentSession: [];
}>();

const t = computed(() => adminTranslations[props.locale]);
const callBatchSize = ref(1);
const showResolved = ref(false);
// Drives the "called N min ago" labels. A minute's resolution needs nothing finer than this.
const now = ref(Date.now());
let waitingTimeTimer: ReturnType<typeof setInterval> | undefined;

const queueCalled = computed(() =>
	props.guests
		.filter((guest) => guest.status === 'called')
		.sort((first, second) => (first.calledAt ?? '').localeCompare(second.calledAt ?? '')),
);
const queueWaiting = computed(() =>
	props.guests
		.filter((guest) => guest.status === 'waiting')
		.sort(
			(first, second) =>
				(first.queuePosition ?? Number.MAX_SAFE_INTEGER) -
				(second.queuePosition ?? Number.MAX_SAFE_INTEGER),
		),
);
const queueResolved = computed(() =>
	props.guests.filter((guest) =>
		(['served', 'no_show', 'not_placed', 'cancelled'] as VisitStatus[]).includes(guest.status),
	),
);
const summary = computed(() =>
	[
		`${props.counts.waiting ?? 0} ${t.value.waitingQueue}`,
		`${props.counts.called ?? 0} ${t.value.calledNow}`,
		`${props.counts.served ?? 0} ${t.value.served}`,
	].join(' · '),
);

onMounted(() => {
	waitingTimeTimer = setInterval(() => {
		now.value = Date.now();
	}, 30_000);
});
onBeforeUnmount(() => clearInterval(waitingTimeTimer));
</script>

<template>
	<section v-if="!serviceStarted" class="admin-section queue-empty">
		<h2>{{ t.queue }}</h2>
		<p>{{ t.queueNotStarted }}</p>
		<AppButton type="button" variant="secondary" @click="emit('navigateCurrentSession')">
			{{ t.goToCurrentSession }}
		</AppButton>
	</section>

	<template v-else>
		<!-- Everything down to the first guest rows is deliberately compact: on a phone this is the
		     only screen a worker uses during service, so the controls must clear the fold. -->
		<p class="queue-summary">{{ summary }}</p>
		<QueueCallNext
			v-model:count="callBatchSize"
			:locale="locale"
			:waiting-count="queueWaiting.length"
			:busy="busy"
			@call="emit('callNext', callBatchSize)"
		/>

		<section class="admin-section">
			<div class="section-heading">
				<h2>{{ t.calledNow }}</h2>
				<span class="queue-count">{{ queueCalled.length }}</span>
			</div>
			<div v-if="queueCalled.length" class="guest-list">
				<QueueGuestRow
					v-for="guest in queueCalled"
					:key="guest.id"
					:locale="locale"
					:guest="guest"
					:now="now"
					:status-label="statusLabels[guest.status]"
					:busy="busy"
					show-waiting-time
					@run="emit('run', guest, $event)"
				/>
			</div>
			<p v-else class="empty-state">{{ t.noCalledGuests }}</p>
		</section>

		<section class="admin-section">
			<div class="section-heading">
				<h2>{{ t.waitingQueue }}</h2>
				<span class="queue-count">{{ queueWaiting.length }}</span>
			</div>
			<div v-if="queueWaiting.length" class="guest-list">
				<QueueGuestRow
					v-for="guest in queueWaiting"
					:key="guest.id"
					:locale="locale"
					:guest="guest"
					:now="now"
					:status-label="statusLabels[guest.status]"
					:busy="busy"
					@run="emit('run', guest, $event)"
				/>
			</div>
			<p v-else class="empty-state">{{ t.noWaitingGuests }}</p>
		</section>

		<AddGuestSection
			:locale="locale"
			:admissions="admissions"
			:busy="busy"
			@add-guest="emit('addGuest', $event)"
		/>

		<section class="admin-section">
			<button class="resolved-toggle" type="button" @click="showResolved = !showResolved">
				{{ showResolved ? t.hideResolved : t.showResolved }} ({{ queueResolved.length }})
			</button>
			<div v-if="showResolved && queueResolved.length" class="guest-list">
				<QueueGuestRow
					v-for="guest in queueResolved"
					:key="guest.id"
					:locale="locale"
					:guest="guest"
					:now="now"
					:status-label="statusLabels[guest.status]"
					:busy="busy"
					@run="emit('run', guest, $event)"
				/>
			</div>
		</section>

		<div class="standalone-action">
			<AppButton type="button" :disabled="busy" @click="emit('closeSession')">
				{{ t.closeSession }}
			</AppButton>
		</div>
	</template>
</template>

<style scoped>
.queue-summary {
	margin: 0 0 14px;
	color: var(--color-text-subtle);
	font-weight: 700;
	font-size: 14px;
}
.queue-count {
	display: grid;
	place-items: center;
	min-width: 34px;
	height: 34px;
	padding: 0 10px;
	border-radius: var(--radius-pill);
	color: var(--color-on-brand);
	background: var(--color-brand);
	font-weight: 700;
}
.resolved-toggle {
	border: 0;
	padding: 0;
	color: var(--color-brand);
	background: transparent;
	font-weight: 700;
	text-decoration: underline;
}
.queue-empty {
	display: grid;
	gap: 14px;
	justify-items: start;
}
.queue-empty p {
	color: var(--color-text-subtle);
	line-height: 1.5;
}
.standalone-action {
	margin-top: 26px;
}
</style>
