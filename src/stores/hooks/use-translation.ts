import { type Ref, toRef } from 'vue';

import type { AdminTranslation } from '@/adminLocales.ts';
import type { Translation } from '@/locales.ts';
import { useStore } from '@/stores/use-store.ts';

export function useTranslation(): Ref<Translation, Translation> {
	const { translations } = useStore();

	return toRef(translations, 'translation');
}

export function useAdminTranslation(): Ref<AdminTranslation, AdminTranslation> {
	const { translations } = useStore();

	return toRef(translations, 'adminTranslation');
}
