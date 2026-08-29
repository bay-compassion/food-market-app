<script setup lang="ts">
import { computed } from 'vue';

import { AppButton } from '@/react-bridge/islands.ts';

import { adminTranslations } from '../../adminLocales';
import type { Locale } from '../../locales';

const props = defineProps<{ locale: Locale; busy?: boolean }>();
const emit = defineEmits<{ send: [] }>();
const broadcast = defineModel<{ title: string; body: string }>({ required: true });

const t = computed(() => adminTranslations.en);
</script>

<template>
	<section class="admin-section broadcast-card">
		<h2>{{ t.broadcastTitle }}</h2>
		<p>{{ t.broadcastHelp }}</p>
		<form @submit.prevent="emit('send')">
			<label>
				<span>{{ t.broadcastTitleLabel }}</span>
				<input v-model.trim="broadcast.title" type="text" maxlength="100" required />
			</label>
			<label>
				<span>{{ t.broadcastMessageLabel }}</span>
				<textarea v-model.trim="broadcast.body" maxlength="500" rows="4" required></textarea>
			</label>
			<AppButton type="submit" :disabled="busy" :label="t.broadcastSend" />
		</form>
	</section>
</template>
