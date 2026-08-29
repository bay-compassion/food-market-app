import type { ComputedRef } from 'vue';

import type { AdminTranslation } from '@/adminLocales.ts';
import type { Translation } from '@/locales.ts';
import { fromMobx } from '@/stores/hooks/from-mobx.ts';
import { useStore } from '@/stores/use-store.ts';

/**
 * The guest-facing copy for the language currently selected.
 *
 * This reads through `fromMobx` rather than Vue's `toRef`, because the translation store is a
 * MobX observable: a plain `toRef` would hand back the right text once and never update when the
 * language changes.
 */
export function useTranslation(): ComputedRef<Translation> {
	const { translations } = useStore();

	return fromMobx(() => translations.translation);
}

/** The admin copy, which is English whatever the app's language is set to. */
export function useAdminTranslation(): ComputedRef<AdminTranslation> {
	const { translations } = useStore();

	return fromMobx(() => translations.adminTranslation);
}
