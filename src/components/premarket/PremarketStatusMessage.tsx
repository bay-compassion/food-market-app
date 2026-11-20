import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';

import type { PremarketEntryState } from '../../stores/premarket-entry.store';
import { useTranslation } from '../../stores/react/use-translation';
import {
	GuestStatusPanel,
	StatusBody,
	StatusHeadline,
} from '../guest-view/status-card/GuestStatusPanel';
import { CloseIcon } from '../ui/icons/CloseIcon';
import { ScheduleIcon } from '../ui/icons/ScheduleIcon';
import { StorefrontIcon } from '../ui/icons/StorefrontIcon';

type MessageState = Exclude<PremarketEntryState, 'open' | 'registered'>;

/** Every way the page can stand other than showing the form: checking, or why it can't. */
export const PremarketStatusMessage = observer(function PremarketStatusMessage({
	state,
	onRetry,
}: {
	state: MessageState;
	onRetry: () => void;
}) {
	const copy = useTranslation().premarket;

	switch (state) {
		case 'checking':
			return (
				<GuestStatusPanel tone="brand" icon={<StorefrontIcon />} heading={copy.title}>
					<StatusBody role="status">{copy.checking}</StatusBody>
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
		case 'missing':
			return (
				<GuestStatusPanel tone="muted" icon={<CloseIcon />} heading={copy.title}>
					<StatusHeadline>{copy.invalidHeading}</StatusHeadline>
					<StatusBody>{state === 'missing' ? copy.missingDetails : copy.invalidDetails}</StatusBody>
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
