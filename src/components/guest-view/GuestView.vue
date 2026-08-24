<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import type { Locale, Translation } from '../../locales';
import QrCodeView from '../QrCodeView.vue';
import GuestQueueScreen from './GuestQueueScreen.vue';

const props = defineProps<{
	t: Translation;
	locale: Locale;
	isReturningVisitor: boolean;
	/**
	 * Whether this view's own content should be visible. `AppFooter`'s `LegalDocumentView` covers
	 * the whole page above this component, so `App.vue` sets this to false rather than unmounting
	 * `GuestView` (which would drop in-progress form input and restart the queue screen's polling).
	 * Applied as a prop, not a `v-show` on `<GuestView>` itself, because this component's template
	 * has two root nodes and Vue cannot forward a `v-show` style onto a multi-root component.
	 */
	visible: boolean;
}>();
defineEmits<{ 'select-language': [locale: Locale] }>();

const route = useRoute();
const router = useRouter();
const isQrCode = computed(() => route.name === 'qr-code');

const queueScreen = ref<InstanceType<typeof GuestQueueScreen> | null>(null);

function showGuest() {
	queueScreen.value?.resetToForm();
	void router.push({ name: 'guest' });
}

defineExpose({ resetToForm: () => queueScreen.value?.resetToForm() });
</script>

<template>
	<QrCodeView
		v-if="isQrCode"
		:back-label="t.backToGuest"
		:title="t.qrCodeTitle"
		:description="t.qrCodeDescription"
		:image-alt="t.qrCodeImageAlt"
		:print-label="t.qrCodePrint"
		@back="showGuest"
	/>
	<GuestQueueScreen
		v-show="!isQrCode && props.visible"
		ref="queueScreen"
		:t="t"
		:locale="locale"
		:is-returning-visitor="isReturningVisitor"
		@select-language="$emit('select-language', $event)"
	/>
</template>
