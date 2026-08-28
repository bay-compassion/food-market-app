<script setup lang="ts">
import { marked } from 'marked';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps<{
	backLabel: string;
	markdown: string;
}>();

const html = computed(() => marked.parse(props.markdown, { async: false, breaks: true }));
</script>

<template>
	<section class="legal-page">
		<RouterLink to="/" class="legal-back">
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<path d="M15 18l-6-6 6-6" />
			</svg>
			{{ backLabel }}
		</RouterLink>
		<div class="legal-content" v-html="html"></div>
	</section>
</template>

<style scoped>
.legal-page {
	width: min(100% - 36px, 560px);
	margin: 0 auto;
	padding: 24px 0 48px;
}
.legal-back {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 20px;
	padding: 0;
	border: 0;
	color: var(--color-brand);
	background: transparent;
	font-weight: 700;
	font-size: 15px;
}
.legal-back svg {
	width: 18px;
}
.legal-content :deep(h1) {
	margin-bottom: 6px;
	color: var(--color-brand);
	font-family: var(--font-heading);
	font-size: 30px;
	letter-spacing: -0.01em;
	text-transform: uppercase;
}
.legal-content :deep(h2) {
	margin-top: 28px;
	margin-bottom: 10px;
	color: var(--color-brand);
	font-family: var(--font-heading);
	font-size: 19px;
	letter-spacing: -0.005em;
}
.legal-content :deep(p) {
	margin-bottom: 14px;
	color: var(--color-text);
	font-size: 16px;
	line-height: 1.6;
}
.legal-content :deep(ul) {
	margin: 0 0 14px;
	padding-left: 20px;
}
.legal-content :deep(li) {
	margin-bottom: 10px;
	color: var(--color-text);
	font-size: 16px;
	line-height: 1.6;
}
.legal-content :deep(a) {
	color: var(--color-brand);
}
.legal-content :deep(hr) {
	margin: 24px 0;
	border: 0;
	border-top: 1px solid var(--color-border);
}
.legal-content :deep(em) {
	display: block;
	margin-top: 8px;
	color: var(--color-text-subtle);
	font-size: 13px;
	line-height: 1.5;
}
</style>
