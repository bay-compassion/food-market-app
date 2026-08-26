<script setup lang="ts">
import { computed } from 'vue';

import { adminTranslations } from '../../adminLocales';
import type { Locale } from '../../locales';
import {
	visitCommandsFrom,
	type VisitCommand,
	type VisitStatus,
} from '../../services/visitStateMachine';

const props = defineProps<{ locale: Locale; status: VisitStatus; disabled?: boolean }>();

defineEmits<{ run: [command: VisitCommand] }>();

const t = computed(() => adminTranslations[props.locale]);
const commands = computed(() => visitCommandsFrom(props.status));
const labels = computed<Record<VisitCommand, string>>(() => ({
	select: t.value.waiting,
	skip: t.value.notPlaced,
	call: t.value.callGuest,
	serve: t.value.markServed,
	mark_no_show: t.value.markNoShow,
	return_to_queue: t.value.returnToQueue,
	cancel: t.value.cancelled,
}));
</script>

<template>
	<div v-if="commands.length" class="visit-commands">
		<button
			v-for="command in commands"
			:key="command"
			type="button"
			:class="{ primary: command === 'call' || command === 'serve' }"
			:disabled="disabled"
			@click="$emit('run', command)"
		>
			{{ labels[command] }}
		</button>
	</div>
</template>

<style scoped>
.visit-commands {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}
.visit-commands button {
	min-height: 44px;
	padding: 0 14px;
	border: 1.5px solid var(--color-brand);
	border-radius: var(--radius-pill);
	color: var(--color-brand);
	background: var(--color-background);
	font-size: 14px;
	font-weight: 700;
}
.visit-commands button.primary {
	color: var(--color-on-brand);
	background: var(--color-brand);
}
.visit-commands button:disabled {
	cursor: wait;
	opacity: 0.65;
}
</style>
