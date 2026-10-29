import type { VisitStatusTranslations } from '@/locales.ts';

import { GuestVisitStatusPanel } from './GuestVisitStatusPanel';

export function RegisteredVisitStatus({ copy }: { copy: VisitStatusTranslations }) {
	return (
		<GuestVisitStatusPanel
			icon="✓"
			heading={copy.registered.header}
			description={copy.registered.details}
		>
			<p>{copy.registered.returnInstructions}</p>
		</GuestVisitStatusPanel>
	);
}
