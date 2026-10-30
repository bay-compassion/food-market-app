import { type ReactNode, useState } from 'react';

import { SessionStatusEnum } from '../../services/sessionStateMachine';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';

const dayMs = 86_400_000;

/**
 * A store whose next registration is three days out, as the server reports it once the next session
 * is scheduled — so a card names a date and offers Add to Calendar. Stories are otherwise
 * unscheduled ("every Saturday"), since none of them seeds a schedule.
 */
export function ScheduledInThreeDays({ children }: { children: ReactNode }) {
	const [store] = useState(() => {
		const seeded = new RootStore();
		const opensAt = new Date(Date.now() + 3 * dayMs).toISOString();
		const closesAt = new Date(Date.now() + 3 * dayMs + 15 * 60_000).toISOString();

		seeded.session.applyServerState({
			event: {
				id: 'scheduled-story',
				status: SessionStatusEnum.SCHEDULED,
				capacity: 100,
				registrationOpensAt: opensAt,
				registrationClosesAt: closesAt,
			},
			nextRegistration: {
				registrationOpensAt: opensAt,
				registrationClosesAt: closesAt,
				timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			},
			questions: [],
			counts: {},
		});

		return seeded;
	});

	return <RootStoreProvider store={store}>{children}</RootStoreProvider>;
}
