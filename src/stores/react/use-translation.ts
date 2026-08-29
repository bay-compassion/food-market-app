import type { Translation } from '@/locales.ts';

import { useRootStore } from './store-context.tsx';

/**
 * The guest-facing copy for the language currently selected.
 *
 * Unlike the Vue hook of the same name, this returns the translation itself rather than a ref:
 * MobX tracks the read directly, so an `observer()` component re-renders when the language
 * changes. A component that is not an `observer()` will read the right text once and then go
 * stale.
 */
export function useTranslation(): Translation {
	return useRootStore().translations.translation;
}
