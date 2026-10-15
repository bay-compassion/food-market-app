/**
 * The admin guide's voiceover, in order. The page plays each line `pause` seconds after the one
 * before it ends, and its beats hang off these lines by id, so rewording a line retimes the video
 * around it: record it again (`voice.ts`), rebuild, and remix.
 *
 * `chapter`, on the first line of a section, starts a chapter there: the player's chapter list and
 * its previous and next buttons jump to it. The page names each one (`CHAPTERS`).
 *
 * The narration follows the dashboard: every label it names is a label on screen
 * (`src/adminLocales.ts`), and every behavior it describes is the real one — `SessionPhaseControls`,
 * `LotteryPendingCard`, `ScheduleView`, `ManualGuestDialog`, `SessionBroadcastForm`, `QueueView`.
 * The video is public, so like guest copy it never mentions standby or lottery weighting, and the
 * frame never shows the weighting control (it only appears while adding a guest to the draw).
 */
import type { AdminTranslation } from '../../../src/adminLocales.ts';
import type { NarrationLine, Voice } from '../stage/reel.ts';

/** A line, with the dashboard labels it says aloud checked against `adminLocales.ts` (`names`). */
type AdminLine = Omit<NarrationLine, 'names'> & { names?: (keyof AdminTranslation)[] };

/** The queue desk guide's voice, so the two staff guides sound like one series. */
export const voice: Voice = { source: 'kokoro', name: 'af_heart', speed: 0.96, language: 'en-us' };

export const lines: AdminLine[] = [
	{
		id: 'welcome',
		chapter: 'intro',
		pause: 2.6,
		text: 'This is a guide to the market dashboard: where a coordinator sets up market day, steers registration and the lottery, and keeps the records.',
	},
	{
		id: 'tabs',
		pause: 0.8,
		text: 'Open the admin dashboard on your phone and sign in. Along the top is a row of screens. Swipe it to reach the rest.',
	},

	{
		id: 'schedule',
		names: ['schedule'],
		chapter: 'schedule',
		pause: 1.2,
		text: 'Market days come from the Schedule. The recurring pattern sets when registration opens each week, how long it stays open, and how many places there are.',
	},
	{
		id: 'upcoming',
		pause: 0.5,
		text: 'Below it is the next session the pattern created. When a session ends, the next one is created automatically.',
	},
	{
		id: 'oneOff',
		names: ['scheduleAddOneOff'],
		pause: 0.5,
		text: 'For a special market, Add one-off schedules a single session in place of the next one.',
	},

	{
		id: 'current',
		names: ['currentSession'],
		chapter: 'scheduled',
		pause: 1.2,
		text: 'Current session follows today’s market step by step. The badge at the top always says where it stands.',
	},
	{
		id: 'scheduled',
		names: ['openRegistrationNow', 'postponeRegistration'],
		pause: 0.5,
		text: 'Registration opens on its own at the scheduled time. Open Early starts it now, and Postpone pushes it back.',
	},

	{
		id: 'open',
		chapter: 'registration',
		pause: 1.2,
		text: 'At ten thirty, registration opens, and guests start signing up from their own phones.',
	},
	{
		id: 'registered',
		names: ['registered'],
		pause: 0.5,
		text: 'Each guest appears under Registered as they join, with their household size, language, and phone number.',
	},
	{
		id: 'overrides',
		pause: 0.5,
		text: 'If guests need more time, extend registration by a few minutes. You can also change the queue capacity: how many places the lottery fills.',
	},
	{
		id: 'closeEarly',
		names: ['closeRegistration'],
		pause: 0.5,
		text: 'Registration closes on its own when the window ends. Close early ends it now, once you confirm.',
	},

	{
		id: 'grace',
		chapter: 'lottery',
		pause: 1.2,
		text: 'After registration closes, a short grace period lets anyone still submitting finish. Then the lottery is pending.',
	},
	{
		id: 'pending',
		names: ['runLotteryNow'],
		pause: 0.5,
		text: 'It draws automatically at the time the schedule sets. Run immediately draws it now, and you can postpone it a few minutes, or pause the automatic draw.',
	},
	{
		id: 'draw',
		pause: 0.5,
		text: 'When the lottery runs, every guest sees their result on their phone, and service starts.',
	},

	{
		id: 'overview',
		names: ['overview'],
		chapter: 'service',
		pause: 1.2,
		text: 'During service, Today’s overview counts guests as they are served, called, and still waiting.',
	},
	{
		id: 'queue',
		names: ['goToQueue'],
		pause: 0.5,
		text: 'Go to Queue opens the line itself. Calling guests up is covered in the queue desk guide.',
	},

	{
		id: 'addGuest',
		names: ['addGuest'],
		chapter: 'addGuest',
		pause: 1.2,
		text: 'Someone who could not register can still be helped. Add guest takes their details, just as the guest form does.',
	},
	{
		id: 'admission',
		names: ['admitToQueue'],
		pause: 0.5,
		text: 'During service, Give them a spot puts them straight into the line, using one of the session’s places.',
	},
	{
		id: 'saveGuest',
		names: ['saveGuest'],
		pause: 0.5,
		text: 'Save guest, and they join the end of the line.',
	},

	{
		id: 'broadcast',
		names: ['broadcastTitle'],
		chapter: 'broadcast',
		pause: 1.2,
		text: 'To reach everyone at once, Broadcast notification sends a message to every guest in today’s session who signed up for updates.',
	},
	{
		id: 'message',
		pause: 0.5,
		text: 'Write a short title and message. It goes out exactly as written, so check it before you send.',
	},

	{
		id: 'database',
		names: ['guestDatabase'],
		chapter: 'records',
		pause: 1.2,
		text: 'Guest database holds everyone on record. Search by name or phone number to find someone.',
	},
	{
		id: 'history',
		names: ['historySessions'],
		pause: 0.5,
		text: 'Session history lists past markets, and you can still add a guest to one after the fact.',
	},
	{
		id: 'reports',
		names: ['reports'],
		pause: 0.5,
		text: 'Reports count people without naming them: sign-ups, guests served, and how full each session ran.',
	},

	{
		id: 'close',
		names: ['closeSession', 'callNext', 'sessionActions'],
		chapter: 'closing',
		pause: 1.2,
		text: 'When nobody is left to call, Close session takes the place of Call next. Closing sooner, from the Session actions menu, marks anyone still waiting as a no show.',
	},
	{
		id: 'next',
		pause: 0.5,
		text: 'The day moves to Session history, and the schedule’s next market is ready, a week away.',
	},
	{
		id: 'thanks',
		pause: 0.8,
		text: 'That’s the market dashboard. Thank you for running the market.',
	},
];
