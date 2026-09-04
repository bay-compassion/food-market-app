import { observer } from 'mobx-react-lite';

import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { CalledVisitStatus } from './visit-status/CalledVisitStatus';
import { CompletedVisitStatus } from './visit-status/CompletedVisitStatus';
import { RegisteredVisitStatus } from './visit-status/RegisteredVisitStatus';
import { WaitingVisitStatus } from './visit-status/WaitingVisitStatus';

/** Chooses the focused presentation for the guest's current visit state. */
export const GuestVisitStatus = observer(function GuestVisitStatus() {
	const t = useTranslation();
	const { visit } = useRootStore();
	const status = visit.currentVisit?.status;
	const copy = t.guestView.visitStatus;

	if (!status) {
		return null;
	}

	switch (status) {
		case 'registered':
			return <RegisteredVisitStatus copy={copy} />;
		case 'waiting':
			return (
				<WaitingVisitStatus
					copy={copy}
					queuePosition={visit.queuePosition}
					guestsAhead={visit.guestsAhead}
				/>
			);
		case 'called':
			return <CalledVisitStatus copy={copy.called} />;
		case 'served':
		case 'not_placed':
		case 'no_show':
		case 'cancelled':
			return <CompletedVisitStatus heading={copy.labels[status]} />;
	}
});
