import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';
import { MarketActionPrompts } from '../admin/market-action-prompts';
import { useQueueDesk } from './queue-desk-context';

/**
 * Ends the day's session after asking, naming how many guests it would leave unserved. Read inside
 * an `observer()` component, so the count is current when the prompt opens.
 */
export function useCloseSession(): () => Promise<void> {
	const { confirmation } = useRootStore();
	const desk = useQueueDesk();
	const { called, waiting } = desk.roster;
	const prompts = new MarketActionPrompts(adminTranslations.en, called.length + waiting.length);

	return async () => {
		if (await confirmation.ask(prompts.for('close_session'))) {
			await desk.closeSession();
		}
	};
}
