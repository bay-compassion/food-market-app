<script setup lang="ts">
import { nextTick, ref, useId, watch } from 'vue';

const props = defineProps<{
	open: boolean;
	title: string;
	closeLabel: string;
}>();

const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement | null>(null);
const titleId = `dialog-title-${useId()}`;

function requestClose() {
	emit('close');
}

function handleBackdropClick(event: MouseEvent) {
	if (event.target === event.currentTarget) {
		requestClose();
	}
}

watch(
	() => props.open,
	async (open) => {
		if (!open) {
			return;
		}

		await nextTick();
		const element = dialog.value;

		if (element && !element.open) {
			element.showModal();
		}
	},
	{ immediate: true },
);
</script>

<template>
	<dialog
		v-if="open"
		ref="dialog"
		class="dialog"
		:aria-labelledby="titleId"
		@cancel.prevent="requestClose"
		@click="handleBackdropClick"
	>
		<section class="dialog-panel">
			<header class="dialog-header">
				<h2 :id="titleId">{{ title }}</h2>
				<button class="dialog-close" type="button" :aria-label="closeLabel" @click="requestClose">
					<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path d="m6 6 12 12M18 6 6 18" />
					</svg>
				</button>
			</header>
			<div class="dialog-content">
				<slot />
			</div>
			<footer v-if="$slots.actions" class="dialog-actions">
				<slot name="actions" />
			</footer>
		</section>
	</dialog>
</template>

<style scoped>
.dialog {
	width: min(100% - 32px, 480px);
	max-height: calc(100dvh - 32px);
	padding: 0;
	overflow: hidden;
	border: 0;
	border-radius: var(--radius-lg);
	color: var(--color-text);
	background: var(--color-background);
	box-shadow: 0 18px 60px rgb(1 42 47 / 24%);
}

.dialog::backdrop {
	background: rgb(1 42 47 / 62%);
}

.dialog-panel {
	display: flex;
	max-height: calc(100dvh - 32px);
	flex-direction: column;
}

.dialog-header {
	display: flex;
	align-items: flex-start;
	gap: 16px;
	padding: 22px 22px 16px;
	border-bottom: 1px solid var(--color-border);
}

.dialog-header h2 {
	flex: 1;
	margin: 0;
	font-family: var(--font-heading);
	font-size: 24px;
	line-height: 1.15;
}

.dialog-close {
	display: grid;
	width: 44px;
	height: 44px;
	margin: -10px -10px -10px 0;
	padding: 10px;
	place-items: center;
	border: 0;
	border-radius: var(--radius-pill);
	color: var(--color-brand);
	background: transparent;
}

.dialog-close:hover {
	background: var(--color-surface-soft);
}

.dialog-close svg {
	width: 24px;
	height: 24px;
	stroke-width: 2;
}

.dialog-content {
	padding: 22px;
	overflow-y: auto;
}

.dialog-actions {
	display: flex;
	justify-content: flex-end;
	gap: 12px;
	padding: 16px 22px 22px;
}
</style>
