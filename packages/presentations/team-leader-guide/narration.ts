/**
 * The team leader guide's voiceover, in order: market day on the dashboard as a team leader runs it,
 * in under two minutes — setting up with the Checklist, then steering registration, the lottery and
 * service, and closing. The market dashboard guide covers each screen at length; this one is the
 * day, start to finish. Lines and chapters work as in `admin-guide/narration.ts`.
 *
 * The narration follows the dashboard as a team leader sees it (`docs/roles.md`): every label it
 * names is a label on screen (`src/adminLocales.ts`), and every behavior it describes is the real
 * one — `ChecklistView` and its stations, `ChecklistStore`, `SessionPhaseControls`,
 * `LotteryPendingCard`, `ManualGuestDialog`, `SessionBroadcastForm`, `QueueView`. The Checklist's
 * labels, and the Today screen's Change the Plan, are nested in their own copy, which `names` can't
 * check: reword those lines by hand when the labels change.
 *
 * The video is public, so like guest copy it never mentions standby or lottery weighting, and it
 * says nothing of where the shared sign-in is kept or how to get past a certificate warning.
 */
import type { AdminTranslation } from '../../../src/adminLocales.ts';
import type { NarrationLine, Voice } from '../stage/reel.ts';

type AdminLine = Omit<NarrationLine, 'names'> & { names?: (keyof AdminTranslation)[] };

/**
 * The dashboard guide's voice, a little slower: this guide covers a whole day in a short time, so
 * each line has more to take in.
 */
export const voice: Voice = { source: 'kokoro', name: 'af_heart', speed: 0.88, language: 'en-us' };

export const lines: AdminLine[] = [
	{
		id: 'welcome',
		chapter: 'intro',
		pause: 2.6,
		text: 'This guide is for team leaders, who lead market day: setting up, running the session, and closing it.',
	},
	{
		id: 'yours',
		pause: 1.4,
		text: 'Sign in to the dashboard on your phone. Managing workers and the guest database stay with coordinators; the rest of market day is yours.',
	},

	{
		id: 'checklist',
		chapter: 'setup',
		pause: 2.2,
		text: 'Start with the Checklist, under More. The banner at the top confirms today’s session is scheduled.',
	},
	{
		id: 'stations',
		pause: 1.4,
		text: 'Then set up both stations, the room display and check-in. Tick each step as you go, and a finished station folds away.',
	},
	{
		id: 'unlock',
		pause: 1.4,
		text: 'If the line board asks for an unlock code, Get an Unlock Code gives you one. Volunteers will ask you for it.',
	},
	{
		id: 'printing',
		pause: 1.4,
		text: 'At check-in, the printing station’s Online step ticks itself once the station is running.',
	},

	{
		id: 'today',
		chapter: 'session',
		pause: 2.2,
		text: 'Today takes it from there. Registration opens and closes on its own, and guests appear as they sign up.',
	},
	{
		id: 'adjust',
		names: ['closeRegistration'],
		pause: 1.4,
		text: 'Under Change the Plan, extend registration if guests need more time, or Close Early to end it now.',
	},
	{
		id: 'lottery',
		names: ['runLotteryNow'],
		pause: 1.4,
		text: 'After a short grace period, the lottery draws by itself. Run Immediately draws it now.',
	},

	{
		id: 'queue',
		chapter: 'service',
		pause: 2.2,
		text: 'Once the lottery is drawn, volunteers call guests up from the queue desk.',
	},
	{
		id: 'addGuest',
		names: ['addGuest', 'admitToQueue'],
		pause: 1.4,
		text: 'For someone who couldn’t register, Add Guest, then Give them a spot, puts them at the end of the line.',
	},
	{
		id: 'broadcast',
		names: ['broadcastTitle'],
		pause: 1.4,
		text: 'If service runs late, Broadcast Notification reaches every guest who signed up for updates, exactly as written.',
	},

	{
		id: 'close',
		names: ['closeSession'],
		chapter: 'closing',
		pause: 2.2,
		text: 'When nobody is left to call, Close Session ends the day, and next week’s market is ready.',
	},
	{
		id: 'thanks',
		pause: 1.4,
		text: 'Thank you for leading the market.',
	},
];
