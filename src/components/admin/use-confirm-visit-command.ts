import { adminTranslations } from '../../adminLocales';
import type { VisitTrack } from '../../services/visit-track';
import type { VisitCommand } from '../../services/visitStateMachine';
import { useRootStore } from '../../stores/react/store-context';

/** Whose visit a command would change, and on which track. */
type NamedGuest = { firstName: string; lastName: string; track?: VisitTrack | null };

/**
 * Asks first before a command that takes something away: a worker's `cancel`, which removes a
 * premarket volunteer or takes a standby guest off the list. Neither can be undone for them; the
 * line's commands run straight away, as they always have.
 */
export function useConfirmVisitCommand(): (
	guest: NamedGuest,
	command: VisitCommand,
) => Promise<boolean> {
	const t = adminTranslations.en;
	const { confirmation } = useRootStore();

	return async (guest, command) => {
		if (command !== 'cancel') {
			return true;
		}

		const name = `${guest.firstName} ${guest.lastName}`;

		return confirmation.ask(
			guest.track === 'postmarket'
				? {
						question: t.takeOffStandbyQuestion.replace('{name}', name),
						details: [t.takeOffStandbyDetails],
						confirmLabel: t.takeOffStandby,
						dismissLabel: t.keepOnStandby,
						destructive: true,
					}
				: {
						question: t.removeFromPremarketQuestion.replace('{name}', name),
						details: [t.removeFromPremarketDetails],
						confirmLabel: t.removeFromPremarket,
						dismissLabel: t.keepInPremarket,
						destructive: true,
					},
		);
	};
}
