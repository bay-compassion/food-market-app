import type { ReactNode } from 'react';

import { RegistrationCountdown } from '@/components/RegistrationCountdown.tsx';
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
			details={<RegistrationCountdown />}
			footer={footer}
		/>
	);
}
