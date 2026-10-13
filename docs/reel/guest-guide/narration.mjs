/**
 * Guest instructions checked against GuestView, GuestCombinedForm, VisitStore, LateArrival,
 * HelpPage and their current translations. Fictional guest: Maya Rivera, (510) 555-0142.
 * English audio, like the queue desk guide; screens and captions use all eight app locales.
 *
 * `chapter`, on the first line of a section, starts a chapter there for the player's chapter list.
 * Its title is `guestView.presentation.chapters[chapter]` in `src/locales.ts`, in every language.
 */
export const voice = { source: 'kokoro', name: 'af_heart', speed: 0.96, language: 'en-us' };

export const lines = [
	{
		id: 'welcome',
		chapter: 'welcome',
		pause: 2.6,
		text: 'Welcome to The Bay Compassion. This is a short guide to signing up and following your visit on your phone.',
	},
	{
		id: 'open',
		chapter: 'openPage',
		pause: 1.2,
		text: 'Scan the market’s code to open the market page on your phone. You can sign up from anywhere, even at home.',
	},
	{
		id: 'language',
		pause: 0.6,
		text: 'Choose your language. The app remembers it, and you can change it at the top of the screen anytime.',
	},
	{
		id: 'closed',
		chapter: 'signUpTime',
		pause: 1.0,
		text: 'If the market is closed, come back on Saturday at ten thirty in the morning.',
	},
	{
		id: 'window',
		pause: 0.8,
		text: 'Sign-up stays open for fifteen minutes. The timer shows how much time is left. There’s no need to rush. Signing up early doesn’t change your chances.',
	},
	{
		id: 'identity',
		chapter: 'form',
		pause: 1.0,
		text: 'Enter your first and last name, and your cell phone number. Please use your full name, rather than just initials.',
	},
	{
		id: 'household',
		pause: 0.6,
		text: 'Answer the questions about your household. Include yourself in the total, and tell us how many children and seniors you’re shopping for.',
	},
	{
		id: 'returning',
		pause: 0.6,
		text: 'If this phone already remembers you, your name and phone are saved. Check your household details for today’s visit.',
	},
	{ id: 'join', pause: 0.8, text: 'When you’ve finished, tap Join the lottery.' },
	{
		id: 'registered',
		chapter: 'entered',
		pause: 0.8,
		text: 'You’re in the lottery confirms that you entered. Your number comes after the draw, if you’re selected.',
	},
	{
		id: 'texts',
		pause: 0.8,
		text: 'Text updates are optional. To receive them, tap Text Me About Updates, then read and agree to the text message consent and tap Enable text updates.',
	},
	{
		id: 'draw',
		chapter: 'draw',
		pause: 1.2,
		text: 'At ten forty-five, the lottery draws. This page updates on its own and shows your result. Everyone has the same chance, and not everyone gets a number.',
	},
	{
		id: 'notSelected',
		pause: 0.8,
		text: 'If it says Not selected today, you can enter again next Saturday at ten thirty. We’re sorry we couldn’t offer you a place today.',
	},
	{
		id: 'number',
		pause: 1.2,
		text: 'If you’re selected, you’ll see You’re on the list, and your number. Maya’s number is four. Head to the market with the phone you signed up on.',
	},
	{
		id: 'line',
		chapter: 'followLine',
		pause: 0.8,
		text: 'Keep this page open to follow the line. Your number stays at the top. Now calling underneath shows the numbers being called at the check-in desk.',
	},
	{
		id: 'display',
		pause: 0.6,
		text: 'The room display shows the same numbers. Watch your phone for your own turn, even as the display moves on.',
	},
	{
		id: 'called',
		chapter: 'yourTurn',
		pause: 1.2,
		text: 'Shopping begins at eleven thirty. When you’re called, your phone says It’s your turn, and your number turns green.',
	},
	{
		id: 'checkin',
		pause: 0.8,
		text: 'Come to the check-in desk now. Show your number on the phone you signed up on. We can’t accept screenshots.',
	},
	{
		id: 'late',
		chapter: 'runningLate',
		pause: 1.2,
		text: 'If you’re taking a little longer, your number gradually turns yellow. Please come to the check-in desk. The color is a reminder that others are waiting.',
	},
	{
		id: 'missed',
		pause: 0.8,
		text: 'If your screen says We missed you, and you’re still here, speak with a market team member at the check-in desk.',
	},
	{
		id: 'finished',
		chapter: 'complete',
		pause: 1.0,
		text: 'After check-in, your phone says Thank you for coming. Your visit is complete.',
	},
	{
		id: 'missedWindow',
		chapter: 'missedSignUp',
		pause: 1.0,
		text: 'If you missed sign-up, the page explains that registration has closed. Come back next Saturday at ten thirty.',
	},
	{
		id: 'underway',
		pause: 0.6,
		text: 'If the market is already underway and you haven’t checked in, speak with a market team member.',
	},
	{
		id: 'help',
		chapter: 'help',
		pause: 1.0,
		text: 'Need a reminder? Tap How it works, or ask any volunteer. Thank you for being here.',
	},
];
