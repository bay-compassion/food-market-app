<script setup lang="ts">
import { computed } from 'vue';

import { AppButton } from '@/react-bridge/islands.ts';

import { adminTranslations } from '../../adminLocales';
import type { Locale } from '../../locales';

const props = defineProps<{ locale: Locale; waitingCount: number; busy?: boolean }>();

defineEmits<{ call: [] }>();
const count = defineModel<number>('count', { required: true });

const t = computed(() => adminTranslations.en);
</script>

<template>
	<form class="call-next" @submit.prevent="$emit('call')">
		<label>
			<span>{{ t.callNextCount }}</span>
			<input v-model.number="count" type="number" min="1" max="50" step="1" required />
		</label>
		<AppButton type="submit" :disabled="busy || waitingCount === 0" :label="t.callNext" />
	</form>
</template>

<style scoped>
.call-next {
	display: grid;
	grid-template-columns: 110px minmax(0, 1fr);
	gap: 12px;
	align-items: end;
	margin-top: 0;
}
</style>
