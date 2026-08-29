<script setup lang="ts">
import type { Translation } from '../locales';

defineProps<{ t: Translation }>();
</script>

<template>
	<footer class="app-footer">
		<RouterLink to="/privacy">{{ t.privacyPolicy }}</RouterLink>
		<span class="app-footer-divider" aria-hidden="true">·</span>
		<RouterLink to="/terms">{{ t.termsAndConditions }}</RouterLink>
	</footer>
</template>
