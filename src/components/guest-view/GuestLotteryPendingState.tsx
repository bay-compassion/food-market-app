import { observer } from 'mobx-react-lite';

import { useTranslation } from '../../stores/react/use-translation';
import { GuestStateMessage } from './GuestStateMessage';

/** Registration is final and the frozen lottery pool is waiting to be drawn. */
export const GuestLotteryPendingState = observer(function GuestLotteryPendingState() {
	const t = useTranslation();

	return (
		<GuestStateMessage
			heading={t.guestView.lotteryPendingState.heading}
			description={t.guestView.lotteryPendingState.description}
		/>
	);
});
