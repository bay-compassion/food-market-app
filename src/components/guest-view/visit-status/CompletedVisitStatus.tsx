import type { VisitStatusTranslations } from '@/locales.ts';

import type { GuestVisitStatusTone } from './GuestVisitStatusPanel';
import { GuestVisitStatusPanel } from './GuestVisitStatusPanel';

/** The visit statuses that have reached an outcome, and so have no queue details or actions left. */
export type CompletedVisitStatusKey = 'served' | 'not_placed' | 'no_show' | 'cancelled';

/**
 * The mark each outcome wears. `no_show` is the only one a guest can still act on — a worker can
 * return them to the queue — so it is the only one that raises its voice.
 */
const outcomeMarks: Record<CompletedVisitStatusKey, { icon: string; tone: GuestVisitStatusTone }> =
	{
		served: { icon: '✓', tone: 'action' },
		not_placed: { icon: '—', tone: 'muted' },
		no_show: { icon: '!', tone: 'warning' },
		cancelled: { icon: '×', tone: 'muted' },
	};

export type CompletedVisitStatusProps = {
	status: CompletedVisitStatusKey;
	copy: VisitStatusTranslations[CompletedVisitStatusKey];
};

/** A visit that has reached an outcome: no queue details or actions remain. */
export function CompletedVisitStatus({ status, copy }: CompletedVisitStatusProps) {
	const { icon, tone } = outcomeMarks[status];

	return (
		<GuestVisitStatusPanel
			icon={icon}
			iconClassName="outcome-mark"
			tone={tone}
			heading={copy.header}
			description={copy.details}
		/>
	);
}
