import styled from '@emotion/styled';

import { RegistrationCountdown } from '@/components/RegistrationCountdown.tsx';
import type { VisitStatusTranslations } from '@/locales.ts';

import { GuestVisitStatusPanel } from './GuestVisitStatusPanel';

const ReturnInstructions = styled.p`
	margin: 0 auto;
	max-width: 280px;
	color: var(--color-text-muted);
	font-size: 16px;
	line-height: 1.55;
	text-align: center;
`;

export function RegisteredVisitStatus({ copy }: { copy: VisitStatusTranslations }) {
	return (
		<>
			<GuestVisitStatusPanel
				icon="✓"
				heading={copy.registered.header}
				description={copy.registered.details}
				details={<RegistrationCountdown />}
			/>
			<ReturnInstructions>{copy.registered.returnInstructions}</ReturnInstructions>
		</>
	);
}
