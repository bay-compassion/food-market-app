<script setup lang="ts">
import { languages, type Locale, type Translation } from '../../locales';
import EyebrowLabel from '../EyebrowLabel.vue';

defineProps<{
	t: Translation;
	locale: Locale;
}>();
defineEmits<{ 'select-language': [locale: Locale] }>();
</script>

<template>
	<div class="hero">
		<EyebrowLabel>{{ t.compassionFood }}</EyebrowLabel>
		<h1>{{ t.welcome }}</h1>
		<p class="hero-copy">{{ t.heroCopy }}</p>
		<section class="language-selector" :aria-label="t.language">
			<p>{{ t.languagePrompt }}</p>
			<div class="language-list" role="group" :aria-label="t.languagePrompt">
				<button
					v-for="language in languages"
					:key="language.code"
					class="language-option"
					:class="{ active: locale === language.code }"
					type="button"
					:aria-pressed="locale === language.code"
					@click="$emit('select-language', language.code)"
				>
					{{ language.label }}
				</button>
			</div>
		</section>
	</div>
</template>
