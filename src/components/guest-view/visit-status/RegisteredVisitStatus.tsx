import styled from '@emotion/styled';

import type { VisitStatusTranslations } from '@/locales.ts';

import { CheckIcon } from '../../ui/icons/CheckIcon';
import { InfoIcon } from '../../ui/icons/InfoIcon';
import { GuestStatusPanel, StatusBody } from '../status-card/GuestStatusPanel';
import { StatusFact } from '../status-card/StatusFact';

/** Set apart under a rule: how to get back here, not news about the visit. */
const ReturnHint = styled.p`
	display: flex;
	align-items: flex-start;
	gap: 10px;
	justify-self: stretch;
	padding-top: 12px;
	border-top: 1px solid var(--color-border-soft);
	color: var(--color-text-muted);
	font-size: 15px;
	line-height: 1.5;

	svg {
		flex-shrink: 0;
		margin-top: 1px;
		color: var(--color-brand);
		font-size: 20px;
	}
`;

/**
 * In the lottery, waiting for the draw: when the result comes, and where. No ticket stamp yet —
 * there is no number for a worker to check it against until the draw.
 */
export function RegisteredVisitStatus({ copy }: { copy: VisitStatusTranslations }) {
	return (
		<GuestStatusPanel tone="brand" icon={<CheckIcon />} heading={copy.registered.header}>
			<StatusFact label={copy.registered.resultLabel} value={copy.registered.resultTime} />
			<StatusBody>{copy.registered.details}</StatusBody>
			<ReturnHint>
				<InfoIcon aria-hidden="true" />
				{copy.registered.returnInstructions}
			</ReturnHint>
		</GuestStatusPanel>
	);
}
