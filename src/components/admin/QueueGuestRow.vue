<script setup lang="ts">
import { computed } from 'vue';

import { adminTranslations } from '../../adminLocales';
import { languages, translations, type Locale } from '../../locales';
import type { VisitCommand } from '../../services/visitStateMachine';
import type { QueueGuest } from './types';
import VisitCommandButtons from './VisitCommandButtons.vue';

const props = defineProps<{
	locale: Locale;
	guest: QueueGuest;
	/** Ticks on a timer so the "called N min ago" label keeps counting up. */
	now: number;
	statusLabel: string;
	busy?: boolean;
	showWaitingTime?: boolean;
}>();

defineEmits<{ run: [command: VisitCommand] }>();

const t = computed(() => adminTranslations[props.locale]);
const base = computed(() => translations[props.locale]);
const guestLanguage = computed(
	() =>
		languages.find((language) => language.code === props.guest.locale)?.label ?? props.guest.locale,
);
const waitingTime = computed(() => {
	if (!props.showWaitingTime || !props.guest.calledAt) {
		return '';
	}
	const minutes = Math.floor((props.now - new Date(props.guest.calledAt).valueOf()) / 60_000);

	return minutes < 1
		? t.value.calledJustNow
		: t.value.calledMinutesAgo.replace('{minutes}', String(minutes));
});
</script>

<template>
	<article class="guest-row">
		<div>
			<strong>
				<span v-if="guest.queuePosition" class="queue-number">{{ guest.queuePosition }}</span>
				{{ guest.firstName }} {{ guest.lastName }}
			</strong>
			<span>
				{{ guest.phone }} · {{ t.householdCount }}: {{ guest.householdSize }} · {{ base.language }}:
				{{ guestLanguage }}
			</span>
			<span v-if="waitingTime" class="waiting-time">{{ waitingTime }}</span>
		</div>
		<div class="guest-actions">
			<span class="guest-status">{{ statusLabel }}</span>
			<VisitCommandButtons
				:locale="locale"
				:status="guest.status"
				:disabled="busy"
				@run="$emit('run', $event)"
			/>
		</div>
	</article>
</template>

<style scoped>
.queue-number {
	display: inline-grid;
	place-items: center;
	min-width: 26px;
	height: 26px;
	margin-inline-end: 6px;
	padding: 0 6px;
	border-radius: var(--radius-pill);
	color: var(--color-on-brand);
	background: var(--color-brand);
	font-size: 13px;
}
.waiting-time {
	font-weight: 700;
}
</style>
