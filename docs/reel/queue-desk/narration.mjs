/**
 * The queue desk video's voiceover, in order. The page plays each line `pause` seconds after the
 * one before it ends, and its beats hang off these lines by id, so rewording a line retimes the
 * video around it: record it again (`voice.mjs`), rebuild, and remix.
 *
 * `say`, where given, is how text to speech should pronounce the line; `text` is what a person
 * reading it sees, and what the page's captions follow.
 *
 * The narration follows the app: every label it names is the label on the queue screen
 * (`src/adminLocales.ts`), and every behavior it describes is the real one (`QueueRoster`,
 * `TicketActions`, `LineOrder`). Like guest copy, it never mentions standby or lottery weighting.
 */

/**
 * Where the voice comes from (see `voice.mjs`). The macOS voice is a draft for checking the pace;
 * Apple's licence does not allow it in a video the market hands out. Once a person has recorded
 * the lines into `queue-desk/voice/`, switch to `{ source: 'recorded', folder: 'queue-desk/voice' }`.
 */
export const voice = { source: 'say', name: 'Samantha' };

export const lines = [
	// Title.
	{
		id: 'welcome',
		pause: 2.6,
		text: 'This is a short guide to the queue desk: the screen volunteers use to call guests up on market day.',
	},

	// Before service.
	{
		id: 'open',
		pause: 1.2,
		text: 'On your phone, open the queue screen and sign in with your volunteer account.',
	},
	{
		id: 'before',
		pause: 0.6,
		text: 'Guests register from their own phones, then the lottery is drawn. Until then, the screen waits.',
	},

	// A tour of the line.
	{
		id: 'tour',
		pause: 1.4,
		text: 'When service starts, the line appears. Waiting lists everyone in line, in the order they’ll be called.',
	},
	{
		id: 'row',
		pause: 0.5,
		text: 'Each row shows the guest’s number, their name, and the language they speak, so you can greet them in it.',
	},
	{
		id: 'sections',
		pause: 0.5,
		text: 'Further down, Not placed lists guests who weren’t drawn today, and Done fills up as you serve people.',
	},
	{
		id: 'display',
		pause: 0.6,
		text: 'The room display shows the same line, but only numbers, never names.',
	},

	// Calling a guest.
	{ id: 'call', pause: 1.2, text: 'When you’re ready for the next guest, tap Call next.' },
	{
		id: 'called',
		pause: 0.4,
		text: 'Their number goes up on the room display, and their phone tells them it’s their turn.',
	},
	{
		id: 'ticket',
		pause: 0.6,
		text: 'Their ticket opens on your screen, with a clock counting from the moment you called them.',
	},

	// The name tag.
	{
		id: 'tag',
		pause: 0.8,
		text: 'The name tag shows their first name and last initial, their number, and their language.',
	},
	{
		id: 'print',
		pause: 0.4,
		text: 'Tap Print name tag, and it prints at the print station, on the market’s computer.',
	},
	{
		id: 'offline',
		pause: 0.4,
		text: 'If the print station is offline, the button says so. Write the tag by hand instead.',
	},

	// Serve and call next.
	{
		id: 'serve',
		pause: 1.0,
		text: 'When the guest has checked in, tap Serve and call next. That finishes their visit and calls the next guest, in one step.',
	},
	{
		id: 'rhythm',
		pause: 0.6,
		text: 'The next ticket opens in its place, so the line moves with one tap per guest.',
	},
	{
		id: 'together',
		pause: 0.6,
		text: 'If two volunteers are calling at once, each tap calls a different guest. Nobody is called twice.',
	},

	// Late arrivals.
	{
		id: 'late',
		pause: 1.2,
		text: 'Sometimes a guest isn’t there yet. Don’t hold up the line. Close their ticket, and call the next guest.',
	},
	{
		id: 'lateWaits',
		pause: 0.5,
		text: 'They stay in Called, showing the minutes since you called them. On their phone, the number slowly turns yellow, asking them to come to the check-in desk.',
	},
	{
		id: 'lateServe',
		pause: 0.8,
		text: 'When they arrive, tap their row, and choose Mark served. That doesn’t call anyone new, so the line stays where it is.',
	},

	// No-shows.
	{
		id: 'noShow',
		pause: 1.2,
		text: 'If someone you called a while ago still hasn’t come, you can mark them as a no-show. They move to a list of their own.',
	},
	{
		id: 'returnBack',
		pause: 0.6,
		text: 'If they turn up later, open their ticket and tap Return to back of line. They keep their number.',
	},
	{
		id: 'returnFront',
		pause: 0.4,
		text: 'The arrow beside it puts them at the front instead, for a guest you called by mistake.',
	},

	// Adding a guest by hand.
	{
		id: 'add',
		pause: 1.2,
		text: 'To put someone in line yourself, tap Add guest, beside Waiting.',
	},
	{
		id: 'addForm',
		pause: 0.4,
		text: 'Enter their details, choose Give them a spot, and pick where they go: the end of the queue, or next up.',
	},
	{
		id: 'addPriority',
		pause: 0.5,
		text: 'Someone you put next up gets a P number, like P1, so nobody else’s number changes.',
		say: 'Someone you put next up gets a P number, like P 1, so nobody else’s number changes.',
	},
	{
		id: 'qr',
		pause: 0.6,
		text: 'Then tap Show QR code for their phone. When they scan it with their camera, their phone follows their place in line.',
	},

	// Reaching a guest.
	{
		id: 'phone',
		pause: 1.0,
		text: 'Need to reach a guest? Phone, on their ticket, calls them. And History shows who called and served them, and when.',
	},

	// Ending the day.
	{
		id: 'finish',
		pause: 1.2,
		text: 'When everyone has been through, Call next turns into Close session.',
	},
	{
		id: 'close',
		pause: 0.5,
		text: 'Tap it and confirm to end the day. The menu at the top can close the session early, too: if anyone is still waiting or called, it says how many, because closing marks them as no-shows.',
	},
	{
		id: 'thanks',
		pause: 1.0,
		text: 'That’s the queue desk. Thank you for helping every neighbor get served.',
	},
];
