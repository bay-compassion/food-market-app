import { adminTranslations } from '../../adminLocales';
import type { AdminView } from './types';

const t = adminTranslations.en;

/** Each screen's name, as the navigation lists it and its title reads. */
export const adminViewLabels: Record<AdminView, string> = {
	checklist: t.checklist.title,
	'current-session': t.currentSession,
	queue: t.queue,
	broadcast: t.broadcastTitle,
	schedule: t.schedule,
	'question-bank': t.questionBank,
	'guest-database': t.guestDatabase,
	'session-history': t.historySessions,
	reports: t.reports,
	workers: 'Workers',
	'dev-mode': t.devMode,
};
