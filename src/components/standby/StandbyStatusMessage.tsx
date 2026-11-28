import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { useTranslation } from '../../stores/react/use-translation';
import type { StandbyEntryState } from '../../stores/standby-entry.store';
import {
	GuestStatusPanel,
	StatusBody,
	StatusHeadline,
} from '../guest-view/status-card/GuestStatusPanel';
import { CloseIcon } from '../ui/icons/CloseIcon';
import { ScheduleIcon } from '../ui/icons/ScheduleIcon';
import { TicketIcon } from '../ui/icons/TicketIcon';

type MessageState = Exclude<StandbyEntryState, 'held' | 'joined'>;

/** Every way the page can stand other than showing the form: pulling a ticket, or why it can't. */
export const StandbyStatusMessage = observer(function StandbyStatusMessage({
	state,
	onRetry,
}: {
	state: MessageState;
	onRetry: () => void;
}) {
	const copy = useTranslation().standby;

	switch (state) {
		case 'checking':
			return (
				<GuestStatusPanel tone="brand" icon={<TicketIcon />} heading={copy.title}>
					<StatusBody role="status">{copy.checking}</StatusBody>
				</GuestStatusPanel>
			);
		case 'not_open':
			return (
				<GuestStatusPanel tone="warning" icon={<ScheduleIcon />} heading={copy.title}>
					<StatusHeadline>{copy.notOpenHeading}</StatusHeadline>
					<StatusBody>{copy.notOpenDetails}</StatusBody>
				</GuestStatusPanel>
			);
		case 'closed':
			return (
				<GuestStatusPanel tone="warning" icon={<ScheduleIcon />} heading={copy.title}>
					<StatusHeadline>{copy.closedHeading}</StatusHeadline>
					<StatusBody>{copy.closedDetails}</StatusBody>
				</GuestStatusPanel>
			);
		case 'invalid':
			return (
				<GuestStatusPanel tone="warning" icon={<CloseIcon />} heading={copy.title}>
					<StatusHeadline>{copy.invalidHeading}</StatusHeadline>
					<StatusBody>{copy.invalidDetails}</StatusBody>
				</GuestStatusPanel>
			);
		case 'unreachable':
			return (
				<GuestStatusPanel tone="warning" icon={<CloseIcon />} heading={copy.title}>
					<StatusHeadline>{copy.unreachableHeading}</StatusHeadline>
					<StatusBody>{copy.unreachableDetails}</StatusBody>
					<Button fullWidth onClick={onRetry}>
						{copy.retry}
					</Button>
				</GuestStatusPanel>
			);
	}
});
