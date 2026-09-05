import type { VisitStatusTranslations } from '@/locales.ts';

import { GuestVisitStatusPanel } from './GuestVisitStatusPanel';

/** A visit that has reached an outcome: no queue details or actions remain. */
export function CompletedVisitStatus({
	copy,
}: {
	copy: VisitStatusTranslations['served' | 'not_placed' | 'no_show' | 'cancelled'];
}) {
	return (
		<GuestVisitStatusPanel
			icon="•"
			iconClassName="outcome-mark"
			heading={copy.header}
			description={copy.details}
		/>
	);
}
