<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { fromMobx } from '@/stores/hooks/from-mobx.ts';
import { useTranslation } from '@/stores/hooks/use-translation.ts';

import { createQrCodeSvg } from '../services/qrCode';

/**
 * The printable poster that points guests at the app. This is a route component, so it reads its
 * own text and does its own navigating rather than taking either as props — the same shape as the
 * legal pages next door.
 */

const t = useTranslation();
const router = useRouter();
const homeUrl = fromMobx(() => window.location.origin + router.resolve({ name: 'guest' }).href);
const qrSvg = fromMobx(() => createQrCodeSvg(homeUrl.value));

function showGuest() {
	void router.push({ name: 'guest' });
}

function print() {
	window.print();
}
</script>

<template>
	<section class="qr-page">
		<div class="qr-page-controls">
			<button type="button" class="qr-back" @click="showGuest">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path d="M15 18l-6-6 6-6" />
				</svg>
				{{ t.backToGuest }}
			</button>
			<button type="button" class="qr-print" @click="print">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path
						d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2"
					/>
					<rect x="6" y="14" width="12" height="7" />
				</svg>
				{{ t.qrCodePrint }}
			</button>
		</div>
		<h1>{{ t.qrCodeTitle }}</h1>
		<p class="qr-description">{{ t.qrCodeDescription }}</p>
		<!-- eslint-disable-next-line vue/no-v-html -->
		<div class="qr-code" role="img" :aria-label="t.qrCodeImageAlt" v-html="qrSvg"></div>
		<p class="qr-url">{{ homeUrl }}</p>
	</section>
</template>

<style scoped>
.qr-page {
	display: grid;
	justify-items: center;
	width: min(100% - 36px, 560px);
	margin: 0 auto;
	padding: 24px 0 48px;
	text-align: center;
}
.qr-page-controls {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	margin-bottom: 20px;
}
.qr-back,
.qr-print {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 0;
	border: 0;
	color: var(--color-brand);
	background: transparent;
	font-weight: 700;
	font-size: 15px;
}
.qr-back svg,
.qr-print svg {
	width: 18px;
}
h1 {
	margin-bottom: 6px;
	color: var(--color-brand);
	font-family: var(--font-heading);
	font-size: 30px;
	letter-spacing: -0.01em;
	text-transform: uppercase;
}
.qr-description {
	max-width: 420px;
	margin-bottom: 28px;
	color: var(--color-text-muted);
	font-size: 16px;
	line-height: 1.6;
}
.qr-code {
	width: min(100%, 320px);
	padding: 20px;
	border: 2px solid var(--color-brand);
	border-radius: var(--radius-lg);
	background: white;
}
.qr-code :deep(svg) {
	display: block;
	width: 100%;
	height: auto;
}
.qr-url {
	margin-top: 20px;
	overflow-wrap: anywhere;
	color: var(--color-text-subtle);
	font-size: 14px;
}

@media print {
	.qr-page {
		width: 100%;
		padding: 0;
	}
	.qr-page-controls {
		display: none;
	}
	.qr-code {
		width: min(100%, 90mm);
		border-color: black;
		break-inside: avoid;
	}
}
</style>
