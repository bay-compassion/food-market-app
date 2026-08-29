<script setup lang="ts">
import { FormField, PhoneField } from '@/react-bridge/islands.ts';
import { useTranslation } from '@/stores/hooks/use-translation.ts';

import type { GuestFormState } from '../types';

const t = useTranslation();
const guest = defineModel<GuestFormState>('guest', { required: true });
</script>

<template>
	<FormField v-model="guest.firstName" :label="t.firstName" required autocomplete="given-name" />
	<FormField v-model="guest.lastName" :label="t.lastName" required autocomplete="family-name" />
	<PhoneField v-model="guest.phone" :label="t.phone" required />
</template>
