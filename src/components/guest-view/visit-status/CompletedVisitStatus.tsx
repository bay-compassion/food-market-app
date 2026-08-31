import { GuestVisitStatusPanel } from './GuestVisitStatusPanel';

/** Terminal visit outcome: no queue details or actions remain. */
export function CompletedVisitStatus({ heading }: { heading: string }) {
	return <GuestVisitStatusPanel icon="•" iconClassName="outcome-mark" heading={heading} />;
}
