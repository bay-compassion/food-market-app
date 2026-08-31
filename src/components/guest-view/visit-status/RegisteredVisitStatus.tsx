import type { ReactNode } from 'react';

import type { VisitStatusTranslations } from '@/locales.ts';

import { GuestVisitStatusPanel } from './GuestVisitStatusPanel';

export function RegisteredVisitStatus({
	copy,
	footer,
}: {
	copy: VisitStatusTranslations;
	footer?: ReactNode;
}) {
	return (
		<GuestVisitStatusPanel
			icon="✓"
			heading={copy.registered.header}
			description={copy.registered.details}
			details={
				<p>
					{copy.currentStatusLabel}: <strong>{copy.labels.registered}</strong>
				</p>
			}
			footer={footer}
		/>
	);
}
