<script setup lang="ts">
import { computed } from 'vue';

import { AppButton } from '@/react-bridge/islands.ts';
import { fromMobx } from '@/stores/hooks/from-mobx.ts';

import { guestVisitStatusLabel } from '../../services/visitStatusLabels';
import { useTranslation } from '../../stores/hooks/use-translation';
import { useRootStore } from '../../stores/root.store';

defineProps<{
	successTitle: string;
	successDescription: string;
}>();

const emit = defineEmits<{ 'cancel-visit': [] }>();

const t = useTranslation();
const rootStore = useRootStore();
const visit = rootStore.visit;

const visitStatusLabel = fromMobx(() =>
	visit.activeVisit
		? guestVisitStatusLabel(rootStore.translations.locale, visit.activeVisit.status)
		: '',
);
const submissionError = fromMobx(() => (visit.cancelError ? t.value.visitError : ''));
const isCalled = fromMobx(() => visit.isCalled);
</script>

<template>
	<div class="success-state">
		<template v-if="isCalled">
			<div class="checkmark called-mark" aria-hidden="true">→</div>
			<h2>{{ t.calledTitle }}</h2>
			<p>{{ t.calledDescription }}</p>
		</template>
		<template v-else>
			<div class="checkmark">✓</div>
			<h2>{{ successTitle }}</h2>
			<div v-if="visit.queuePosition" class="queue-standing">
				<p class="queue-position">
					<span>{{ t.queuePositionLabel }}</span>
					<strong>{{ visit.queuePosition }}</strong>
				</p>
				<p v-if="visit.guestsAhead === 0" class="queue-next">{{ t.youAreNext }}</p>
				<p v-else-if="visit.guestsAhead !== null">
					{{ t.guestsAheadOfYou }}: <strong>{{ visit.guestsAhead }}</strong>
				</p>
			</div>
			<p v-else>
				{{ t.currentStatus }}: <strong>{{ visitStatusLabel }}</strong>
			</p>
			<p>{{ successDescription }}</p>
		</template>
		<p v-if="submissionError" class="submission-error" role="alert">
			{{ submissionError }}
		</p>
		<AppButton
			v-if="visit.canCancel"
			type="button"
			variant="secondary"
			:disabled="visit.isCancelling"
			@click="emit('cancel-visit')"
			:label="t.cancelVisit"
		/>
	</div>
</template>

<style scoped>
.success-state {
	display: grid;
	min-height: 340px;
	place-content: center;
	text-align: center;
}
.submission-error {
	margin: 0;
	color: var(--color-error);
	font-size: 13px;
	line-height: 1.4;
}
.success-state h2 {
	margin-bottom: 9px;
	font-family: var(--font-heading);
	font-size: 29px;
	letter-spacing: -0.01em;
	text-transform: uppercase;
	color: var(--color-text);
}
.success-state p {
	max-width: 280px;
	margin: 0 auto 27px;
	color: var(--color-text-muted);
	font-size: 16px;
	line-height: 1.55;
}
.checkmark {
	display: grid;
	width: 58px;
	height: 58px;
	place-self: center;
	place-items: center;
	margin-bottom: 19px;
	border-radius: var(--radius-md);
	color: var(--color-on-brand);
	background: var(--color-brand);
	font-size: 29px;
}
.called-mark {
	background: var(--color-error);
	font-size: 34px;
}
.queue-standing {
	margin-bottom: 27px;
	padding: 18px;
	border-radius: var(--radius-md);
	background: var(--color-surface-soft);
}
.queue-standing p {
	margin-bottom: 0;
}
.queue-position {
	display: grid;
	gap: 4px;
	margin-bottom: 8px;
}
.queue-position strong {
	font-family: var(--font-heading);
	font-size: 44px;
	line-height: 1;
	color: var(--color-brand);
}
.queue-next {
	font-weight: 700;
}
</style>
