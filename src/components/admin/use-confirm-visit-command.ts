import { adminTranslations } from '../../adminLocales';
import type { VisitCommand } from '../../services/visitStateMachine';
import { useRootStore } from '../../stores/react/store-context';

/** Whose visit a command would change. */
type NamedGuest = { firstName: string; lastName: string };

/**
 * Asks first before a command that takes something away. The only one a worker is offered is
 * removing a premarket volunteer (`cancel`), which their own scan or a colleague cannot undo for
 * them; the line's commands run straight away, as they always have.
 */
export function useConfirmVisitCommand(): (
	guest: NamedGuest,
	command: VisitCommand,
) => Promise<boolean> {
	const t = adminTranslations.en;
	const { confirmation } = useRootStore();

	return async (guest, command) =>
		command !== 'cancel' ||
		confirmation.ask({
			question: t.removeFromPremarketQuestion.replace(
				'{name}',
				`${guest.firstName} ${guest.lastName}`,
			),
			details: [t.removeFromPremarketDetails],
			confirmLabel: t.removeFromPremarket,
			dismissLabel: t.keepInPremarket,
			destructive: true,
		});
}
