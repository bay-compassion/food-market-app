import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { ManualAdmission } from '../../services/guestAdmission';
import type { SessionCommand } from '../../services/sessionStateMachine';
import { currentSessionState } from '../../services/sessionStateMachine';
import type { VisitStatus } from '../../services/visitStateMachine';
import { useRootStore } from '../../stores/react/store-context';
import { SessionView } from './SessionView';
import type { ManualGuest, QueueGuest } from './types';

export type SessionTabProps = {
	statusLabels: Record<VisitStatus, string>;
	registeredGuests: QueueGuest[];
	admissions: ManualAdmission[];
	onRun: (action: SessionCommand) => void;
	onAddGuest: (guest: ManualGuest) => void;
	onNavigateQueue: () => void;
	onNavigateSchedule: () => void;
};

/**
 * The Session tab: the live session and the overrides a worker can apply to it. The minutes typed
 * into its postpone and extend fields belong to this screen alone, so they live here rather than in
 * the dashboard around every screen.
 */
export const SessionTab = observer(function SessionTab(props: SessionTabProps) {
	const t = adminTranslations.en;
	const { admin, session, confirmation } = useRootStore();
	const [extensionMinutes, setExtensionMinutes] = useState(30);
	const [postponementMinutes, setPostponementMinutes] = useState(30);
	const event = session.currentState?.event ?? null;

	async function postponeRegistration() {
		const confirmed = await confirmation.ask({
			question: t.confirmPostponeRegistration,
			confirmLabel: t.confirmContinue,
			dismissLabel: t.cancel,
		});

		if (confirmed && (await admin.postponeRegistration(postponementMinutes))) {
			setPostponementMinutes(30);
		}
	}

	async function extendRegistration() {
		if (!event) {
			return;
		}

		const closesAt = new Date(
			new Date(event.registrationClosesAt).valueOf() + extensionMinutes * 60_000,
		).toISOString();

		if (await admin.updateRegistrationOverrides(closesAt, event.capacity)) {
			setExtensionMinutes(30);
		}
	}

	return (
		<SessionView
			{...props}
			event={event}
			sessionState={currentSessionState(event?.status)}
			counts={session.currentState?.counts ?? {}}
			busy={admin.isBusy}
			extensionMinutes={extensionMinutes}
			onExtensionMinutesChange={setExtensionMinutes}
			postponementMinutes={postponementMinutes}
			onPostponementMinutesChange={setPostponementMinutes}
			onPostponeRegistration={() => void postponeRegistration()}
			onExtendRegistration={() => void extendRegistration()}
			onSaveCapacityOverride={(capacity) =>
				event && void admin.updateRegistrationOverrides(event.registrationClosesAt, capacity)
			}
		/>
	);
});
