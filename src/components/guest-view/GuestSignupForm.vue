<script setup lang="ts">
import type { Translation } from '../../locales';
import FormField from '../FormField.vue';
import PhoneField from '../PhoneField.vue';
import type { GuestFormState } from '../types';

defineProps<{ t: Translation }>();

const guest = defineModel<GuestFormState>('guest', { required: true });
</script>

<template>
	<FormField v-model="guest.firstName" :label="t.firstName" required autocomplete="given-name" />
	<FormField v-model="guest.lastName" :label="t.lastName" required autocomplete="family-name" />
	<PhoneField v-model="guest.phone" :label="t.phone" required />
</template>
