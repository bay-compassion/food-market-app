import type { VisitStatusTranslations } from '@/locales.ts';

import { GuestVisitStatusPanel } from './GuestVisitStatusPanel';

export function CalledVisitStatus({ copy }: { copy: VisitStatusTranslations['called'] }) {
	return (
		<GuestVisitStatusPanel
			icon="→"
			iconClassName="called-mark"
			tone="urgent"
			heading={copy.header}
			description={copy.details}
		/>
	);
}
