import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { QueueDeskProvider } from '../queue/queue-desk-context';
import { QueueDeskMessage } from '../queue/QueueDesk';
import { QueueLine } from '../queue/QueueLine';
import { useQueueDeskStore } from '../queue/use-queue-desk-store';
import { QueueNotStarted } from './QueueNotStarted';

export type QueueViewProps = {
	onNavigateCurrentSession: () => void;
};

/**
 * The dashboard's Queue tab: the queue desk's own line, inside the dashboard. The standalone
 * `/queue` screen is the one the line is designed for, so the tab adds nothing of its own once
 * service runs — one screen to learn, and one place a change to the line has to be made.
 *
 * The desk's store lives as long as the tab is open, polling the line as it does on `/queue`.
 */
export const QueueView = observer(function QueueView({ onNavigateCurrentSession }: QueueViewProps) {
	const t = adminTranslations.en;
	const desk = useQueueDeskStore();

	if (!desk) {
		return <QueueDeskMessage text={t.queueDesk.loading} />;
	}

	let content;

	switch (desk.phase) {
		case 'loading':
			content = <QueueDeskMessage text={t.queueDesk.loading} />;
			break;
		case 'not_permitted':
			content = <QueueDeskMessage text={t.queueDesk.notPermitted} />;
			break;
		case 'not_started':
			content = <QueueNotStarted onNavigateCurrentSession={onNavigateCurrentSession} />;
			break;
		case 'ended':
			content = <QueueDeskMessage text={t.queueDesk.ended} />;
			break;
		case 'serving':
			content = <QueueLine embedded />;
	}

	return <QueueDeskProvider value={desk}>{content}</QueueDeskProvider>;
});
