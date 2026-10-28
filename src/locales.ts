import { outdent } from 'outdent';

/**
 * `label` is the language's own name, for a guest choosing it; `englishLabel` is what an
 * English-reading worker sees on the admin screens.
 *
 * The original languages are ordered by how many people speak each language at home in
 * Contra Costa County (ACS 2024 1-year, table B16001). Portuguese and Russian follow that group.
 */
export const languages = [
	{ code: 'en', label: 'English', englishLabel: 'English' },
	{ code: 'es', label: 'Español', englishLabel: 'Spanish' },
	{ code: 'tl', label: 'Tagalog', englishLabel: 'Tagalog' },
	{ code: 'zh', label: '中文', englishLabel: 'Chinese' },
	{ code: 'fa', label: 'فارسی', englishLabel: 'Farsi' },
	{ code: 'ar', label: 'العربية', englishLabel: 'Arabic' },
	{ code: 'vi', label: 'Tiếng Việt', englishLabel: 'Vietnamese' },
	{ code: 'fr', label: 'Français', englishLabel: 'French' },
	{ code: 'pt', label: 'Português', englishLabel: 'Portuguese' },
	{ code: 'ru', label: 'Русский', englishLabel: 'Russian' },
] as const;

export type Locale = (typeof languages)[number]['code'];

export function isLocale(value: unknown): value is Locale {
	return languages.some(({ code }) => code === value);
}

export interface VisitStatusTranslations {
	/** Heads the guest's queue number on the waiting and called cards. A number, not a position. */
	yourNumberLabel: string;
	labels: {
		registered: string;
		waiting: string;
		called: string;
		served: string;
		not_placed: string;
		no_show: string;
		cancelled: string;
	};
	registered: {
		header: string;
		details: string;
	};
	waiting: {
		header: string;
		details: string;
		guestsAheadLabel: string;
		youAreNext: string;
		nowCallingLabel: string;
		nowCallingNone: string;
	};
	called: {
		header: string;
		/** Replaces `header` at the same moment `detailsLate` replaces `details`. */
		headerLate: string;
		details: string;
		/**
		 * Replaces `details` once the guest's board is fully yellow (`LateArrival.isLateAt`): their
		 * turn never expires, but others are waiting behind them.
		 */
		detailsLate: string;
		/** Read to a screen reader in place of the board warming toward yellow, when exactly one. */
		calledMinutesAgoOne: string;
		/** The same for any other count; `{minutes}` is how many. */
		calledMinutesAgoOther: string;
	};
	served: {
		header: string;
		details: string;
	};
	not_placed: {
		header: string;
		details: string;
	};
	no_show: {
		header: string;
		details: string;
	};
	cancelled: {
		header: string;
		details: string;
	};
	cancelAction: string;
	cancelConfirmation: string;
	/** Confirms the cancellation in the sheet `cancelConfirmation` heads. */
	cancelConfirm: string;
	/** Backs out of that sheet, leaving the visit as it was. */
	cancelDismiss: string;
	updateError: string;
}

/** One step of the guided tour: an optional time of day, what happens, and what to do. */
export interface GuestTourStepTranslations {
	time?: string;
	title: string;
	body: string;
}

/**
 * The guided tour a first-time guest is offered after choosing a language, replayable from the
 * menu. A step's `body` may name another control by its own label: `{submit}` is the form's submit
 * button, `{action}` the text-updates button, and `{help}` the help page.
 */
export interface GuestTourTranslations {
	/** `{current}` and `{total}` are step numbers. */
	progress: string;
	/** The first step's button, which starts the tour proper. */
	start: string;
	next: string;
	back: string;
	skip: string;
	/** The last step's button. */
	done: string;
	/** Accessible name of the tour dialog's close button, which ends the tour. */
	close: string;
	steps: {
		welcome: GuestTourStepTranslations;
		language: GuestTourStepTranslations;
		countdown: GuestTourStepTranslations;
		form: GuestTourStepTranslations;
		textUpdates: GuestTourStepTranslations;
		lottery: GuestTourStepTranslations;
		line: GuestTourStepTranslations;
		turn: GuestTourStepTranslations;
		help: GuestTourStepTranslations;
		replay: GuestTourStepTranslations;
	};
}

/** Playback copy for the guest instructional presentation. Narration is in English. */
export interface GuestPresentationTranslations {
	watch: string;
	close: string;
	title: string;
	heading: string;
	summary: string;
	description: string;
	play: string;
	pause: string;
	restart: string;
	fullscreen: string;
	exitFullscreen: string;
	soundOn: string;
	soundOff: string;
	noSound: string;
	/** The toggle for the music under the narration; the voice plays either way. */
	musicOn: string;
	musicOff: string;
	volume: string;
	seek: string;
	open: string;
	download: string;
	more: string;
	/** Names the chapter picker in the player's controls. */
	chapter: string;
	previousChapter: string;
	nextChapter: string;
	/** Names the toggle that pauses playback as each chapter ends; the hint says what it does. */
	stepByStep: string;
	stepByStepHint: string;
	/** Chapter titles, keyed by the `chapter` field on the narration line each one starts at. */
	chapters: GuestPresentationChapters;
}

/**
 * The guest guide's chapters (`packages/presentations/guest-guide/narration.ts`), in playing order.
 */
export interface GuestPresentationChapters {
	welcome: string;
	openPage: string;
	signUpTime: string;
	form: string;
	entered: string;
	draw: string;
	followLine: string;
	yourTurn: string;
	runningLate: string;
	complete: string;
	missedSignUp: string;
	help: string;
}

export interface GuestViewTranslations {
	presentation: GuestPresentationTranslations;
	/** Under the first-visit language picker: the choice is not final, and where to change it. */
	languageHint: string;
	/** Leads into the link to the help page, for a guest the home screen leaves unsure. */
	helpPrompt: string;
	tour: GuestTourTranslations;
	forms: {
		informationLegend: string;
		/** The optional field for how to say the guest's name, for whoever calls it out. */
		/** The folded strip under the first name that offers the optional pronunciation field. */
		pronunciationOffer: string;
		/** Short, in front of the open field: what the guest writes is how the name sounds. */
		pronunciationLabel: string;
		pronunciationHelp: string;
		/** Names the button that folds the pronunciation field away again. */
		pronunciationCollapse: string;
		lotteryLegend: string;
		questionsLegend: string;
		/** Under the seniors count: the guest is one of them when they are 55 or older. */
		seniorsHint: string;
		/** Under the household count, when its children and seniors add up to more than it. */
		exceedsHousehold: string;
		/** Under the children count, when it leaves no adult in the household to shop for it. */
		noAdult: string;
		/** The card a returning guest sees in place of the household fields this phone saved. */
		savedHousehold: {
			/** Small label above the heading: where the values came from. */
			eyebrow: string;
			heading: string;
			/** Button: the saved household is still right. Quoted by `prompt`. */
			confirm: string;
			/** Button: open the fields to change them. Quoted by `prompt`. */
			change: string;
			/** The collapsed card, once the guest has confirmed. */
			confirmed: string;
			/** The browser's validation message when the guest taps "Join" before answering. */
			prompt: string;
			/** Title of the dialog "Change" opens. */
			changeHeading: string;
			/** Dialog button: put the changes in the form, which also confirms the household. */
			update: string;
			/** Dialog button: drop the changes and go back to the summary. */
			cancel: string;
			/** Accessible name of the dialog's close button. */
			close: string;
		};
		/** The pinned bar's checklist for a returning guest, until everything is done. */
		joinSteps: {
			/** Accessible name of the list. */
			label: string;
			confirmHousehold: string;
			householdConfirmed: string;
			answerQuestions: string;
			questionsAnswered: string;
		};
		/** Under a count the guest left empty or typed wrongly. `{min}` and `{max}` are the range. */
		countErrors: {
			required: string;
			notWholeNumber: string;
			outOfRange: string;
		};
	};
	identityIndicator: {
		cancelForgetInformation: string;
		closeForgetDialog: string;
		closeNotificationsDialog: string;
		forgetDialogDescription: string;
		forgetDialogTitle: string;
		forgetInformation: string;
		heading: string;
		notificationsAction: string;
		notificationsDialogTitle: string;
		notificationsEnabled: string;
		notificationsError: string;
		notificationsLoading: string;
		openIdentityMenu: string;
		optOut: string;
		optOutError: string;
		saveInformationAction: string;
		unidentifiedHeading: string;
		unidentifiedMessage: string;
	};
	notificationOptIn: {
		consentLabel: string;
		enable: string;
		enabled: string;
		error: string;
		optedOut: string;
		sendStart: string;
		checkStart: string;
	};
	scheduleInformation: {
		heading: string;
		body: string;
	};
	notOpenState: {
		heading: string;
		subheading: string;
		lotteryDescription: string;
		selectionDescription: string;
	};
	registrationClosedState: {
		heading: string;
		description: string;
	};
	serviceState: {
		inProgressHeading: string;
		inProgressDescription: string;
	};
	refreshNotice: {
		countdown: string;
		updating: string;
		noNeedToRefresh: string;
		accessibleDescription: string;
	};
	visitStatus: VisitStatusTranslations;
}

export interface SignupViewTranslations {
	formDescription: string;
	formTitle: string;
	submit: string;
	submitting: string;
	successDescription: string;
	successTitle: string;
}

export interface ClaimViewTranslations {
	title: string;
	description: string;
	replaceHeading: string;
	replaceWarning: string;
	submit: string;
	submitting: string;
	failed: string;
	missingCode: string;
}

/** The room display at `/kiosk`, read from across the room rather than on a phone. */
export interface KioskTranslations {
	nowCalling: string;
	nowCallingNone: string;
	/** Heads the numbers called earlier that nobody has come up for yet. */
	stillWaitingFor: string;
	/** `{count}` is how many guests are still in line, not yet called. */
	waitingCount: string;
	/** The tile standing in for unclaimed numbers that don't fit; `{count}` is how many. */
	moreCount: string;
	notStarted: string;
	ended: string;
	loading: string;
	reconnecting: string;
	/** The full screen button's accessible name; the button itself is only an icon. */
	fullscreen: string;
}

/** The `/help` page: how a market Saturday works, step by step, matching the printed flyer. */
export interface HelpTranslations {
	/** The page heading, and the label of every link that leads to the page. */
	title: string;
	introHeading: string;
	introBody: string;
	stepsHeading: string;
	/** In order; a step with a `time` is one the guest should do at that time. */
	steps: HelpStepTranslations[];
	phoneNotice: { heading: string; body: string };
}

export interface HelpStepTranslations {
	time?: string;
	title: string;
	body: string;
}

/** The Sentry feedback form's copy, keyed by the label names `feedbackIntegration` accepts. */
export interface FeedbackFormTranslations {
	formTitle: string;
	nameLabel: string;
	namePlaceholder: string;
	messageLabel: string;
	messagePlaceholder: string;
	submitButtonLabel: string;
	cancelButtonLabel: string;
	successMessageText: string;
	isRequiredLabel: string;
	errorEmptyMessageText: string;
	errorTimeoutText: string;
	errorGenericText: string;
}

export interface DeviceDetailsTranslations {
	/** The menu item, and the dialog's heading. */
	title: string;
	close: string;
	/** The install ID: random, made on first launch, and naming the device rather than the guest. */
	installIdLabel: string;
	/** The device token: the credential saved once a guest registers on this device. */
	deviceTokenLabel: string;
	deviceTokenHint: string;
	/** Each Copy button's visible text; its accessible name is `copyInstallId`/`copyDeviceToken`. */
	copy: string;
	copied: string;
	copyInstallId: string;
	copyDeviceToken: string;
	copyError: string;
}

export interface AppBarTranslations {
	openMenu: string;
	accountMenu: string;
	website: string;
	qrCode: string;
	staffLogin: string;
	adminPanel: string;
	signOut: string;
	sendFeedback: string;
	/** The menu item and dialog that show this device's identifiers to read out to staff. */
	deviceDetails: DeviceDetailsTranslations;
	/** The menu item that replays the guided tour. */
	takeTour: string;
	/** The menu item and dialog for choosing light, dark, or the device's own setting. */
	colorMode: ColorModeTranslations;
	feedbackForm: FeedbackFormTranslations;
}

export interface ColorModeTranslations {
	title: string;
	close: string;
	system: string;
	light: string;
	dark: string;
}

/** A push notification's headline and detail. */
export interface NotificationMessageTranslations {
	title: string;
	body: string;
}

/** Everything a guest is told about their visit outside the page: push, text, and their prompts. */
export interface NotificationTranslations {
	registered: NotificationMessageTranslations;
	registrationClosed: NotificationMessageTranslations;
	selected: NotificationMessageTranslations;
	notSelected: NotificationMessageTranslations;
	called: NotificationMessageTranslations;
	/** Text messages. These have no title: each is one line, with the prefix added around it. */
	sms: {
		/** Sent when a guest consents to texts, so it stands alone. */
		welcome: string;
		/** `{number}` is the guest's queue number, which never changes once given. */
		selected: string;
		notSelected: string;
		called: string;
	};
	/** Asking the browser for push permission. */
	pushOptIn: {
		enable: string;
		denied: string;
		enabled: string;
		error: string;
		iosInstall: string;
		unsupported: string;
	};
}

/** The page shown in place of a screen that crashed, rather than a blank one. */
export interface AppErrorTranslations {
	heading: string;
	description: string;
	reload: string;
}

export interface HoldingPageTranslations {
	heading: string;
	instructions: string;
	currentAppHeading: string;
	currentAppDescription: string;
	currentAppLink: string;
}

/**
 * The registration-form copy that speaks to the guest ("your information", "you're shopping for").
 * A worker adding a guest by hand fills in the same forms for someone else, so the admin dialog
 * replaces exactly these with its own staff wording; every other label is neutral as it stands.
 */
export type GuestFormCopy = Pick<
	GuestViewTranslations['forms'],
	| 'informationLegend'
	| 'pronunciationOffer'
	| 'pronunciationHelp'
	| 'pronunciationCollapse'
	| 'lotteryLegend'
	| 'seniorsHint'
	| 'exceedsHousehold'
	| 'noAdult'
> &
	Pick<
		Translation,
		'agePlaceholder' | 'household' | 'householdHint' | 'childrenCount' | 'seniorsCount'
	>;

export interface Translation {
	appError: AppErrorTranslations;
	holdingPage: HoldingPageTranslations;
	appBar: AppBarTranslations;
	guestView: GuestViewTranslations;
	signupView: SignupViewTranslations;
	claimView: ClaimViewTranslations;
	kiosk: KioskTranslations;
	help: HelpTranslations;
	admin: string;
	adminDescription: string;
	adminTitle: string;
	age: string;
	agePlaceholder: string;
	ageRange0to17: string;
	ageRange18to29: string;
	ageRange30to44: string;
	ageRange45to59: string;
	ageRange60to74: string;
	ageRange75plus: string;
	authConfigurationDescription: string;
	authConfigurationRequired: string;
	authError: string;
	authLoading: string;
	backToGuest: string;
	childrenCount: string;
	countDecrementLabel: string;
	countIncrementLabel: string;
	chooseAnswer: string;
	firstName: string;
	formDescription: string;
	formTitle: string;
	guest: string;
	household: string;
	householdHint: string;
	lastName: string;
	language: string;
	languagePrompt: string;
	marketName: string;
	notifications: NotificationTranslations;
	seniorsCount: string;
	phone: string;
	privacy: string;
	privacyPolicy: string;
	qrCodeDescription: string;
	qrCodeImageAlt: string;
	qrCodePrint: string;
	qrCodeTitle: string;
	registrationClosesIn: string;
	registrationClosesInMinutes: string;
	submissionError: string;
	submit: string;
	submitting: string;
	termsAndConditions: string;
	statusLoading: string;
	welcome: string;
}

export const translations = {
	en: {
		appError: {
			heading: 'Something Went Wrong',
			description: 'The app hit a problem and couldn’t show this page. Reloading usually fixes it.',
			reload: 'Reload',
		},
		holdingPage: {
			heading: 'New app launches October 31',
			instructions: 'Keep this QR code and scan it again on October 31.',
			currentAppHeading: 'Looking for today’s food market?',
			currentAppDescription:
				'Use the current app until October 31. This QR code is for the new app.',
			currentAppLink: 'Open the current app',
		},
		appBar: {
			openMenu: 'Open menu',
			accountMenu: 'Account menu',
			website: 'The Bay Compassion website',
			qrCode: 'QR Code',
			staffLogin: 'Staff Login',
			adminPanel: 'Admin Panel',
			signOut: 'Sign Out',
			sendFeedback: 'Send feedback',
			deviceDetails: {
				title: 'Device details',
				close: 'Close device details',
				installIdLabel: 'Device ID',
				deviceTokenLabel: 'Guest token',
				deviceTokenHint: 'Share this only with a staff member.',
				copy: 'Copy',
				copied: 'Copied',
				copyInstallId: 'Copy device ID',
				copyDeviceToken: 'Copy guest token',
				copyError: 'We could not copy that. Please try again.',
			},
			takeTour: 'Take the tour',
			colorMode: {
				title: 'Appearance',
				close: 'Close appearance settings',
				system: 'Match This Device',
				light: 'Light',
				dark: 'Dark',
			},
			feedbackForm: {
				formTitle: 'Send feedback',
				nameLabel: 'Name (optional)',
				namePlaceholder: 'Your name',
				messageLabel: 'Your feedback',
				messagePlaceholder:
					'Tell us what went wrong or what could be better. Please leave out personal details.',
				submitButtonLabel: 'Send',
				cancelButtonLabel: 'Cancel',
				successMessageText: 'Thank you for your feedback!',
				isRequiredLabel: '(required)',
				errorEmptyMessageText: 'Please write a message before sending.',
				errorTimeoutText: 'Sending took too long. Please try again.',
				errorGenericText: 'Your feedback could not be sent. Please try again.',
			},
		},
		guestView: {
			presentation: {
				watch: 'Watch the Guest Guide',
				close: 'Close guest guide',
				title: 'Guest Market Guide',
				heading: 'Your visit to The Bay Compassion',
				summary: 'A short guide for guests on market day.',
				description:
					'Learn how to register, read your lottery result, follow your number, and come to the check-in desk.',
				play: 'Play',
				pause: 'Pause',
				restart: 'Restart',
				fullscreen: 'Full Screen',
				exitFullscreen: 'Exit Full Screen',
				soundOn: 'Sound on',
				soundOff: 'Sound off',
				noSound: 'No sound',
				musicOn: 'Music on',
				musicOff: 'Music off',
				volume: 'Volume',
				seek: 'Seek',
				open: 'Open presentation',
				download: 'Download presentation',
				more: 'More presentations',
				chapter: 'Chapter',
				previousChapter: 'Previous chapter',
				nextChapter: 'Next chapter',
				stepByStep: 'Step by step',
				stepByStepHint: 'Pause at the end of each chapter',
				chapters: {
					welcome: 'Welcome',
					openPage: 'Open the market page',
					signUpTime: 'When to sign up',
					form: 'Fill in the form',
					entered: 'You’re in the lottery',
					draw: 'The lottery draw',
					followLine: 'Follow the line',
					yourTurn: 'It’s your turn',
					runningLate: 'Running late',
					complete: 'Visit complete',
					missedSignUp: 'If you missed sign-up',
					help: 'Getting help',
				},
			},
			languageHint: 'You can change your language anytime at the top of the screen.',
			helpPrompt: 'Not sure what to do?',
			tour: {
				progress: '{current} of {total}',
				start: 'Show me',
				next: 'Next',
				back: 'Back',
				skip: 'Skip tour',
				done: 'Done',
				close: 'Close tour',
				steps: {
					welcome: {
						title: 'Welcome! Here’s how it works',
						body: 'There’s no rush. Sign-up stays open for 15 minutes, and signing up early doesn’t change your chances. You can skip this tour and come back to it anytime from the menu.',
					},
					language: {
						title: 'Your language',
						body: 'Tap here to change your language anytime. The app remembers it for next time.',
					},
					countdown: {
						time: '10:30 AM',
						title: 'Sign-up opens',
						body: 'Every Saturday at 10:30 AM, sign-up opens for 15 minutes. You can sign up from anywhere, even at home. While it’s open, a timer on this screen shows how much time is left.',
					},
					form: {
						title: 'Fill in the form',
						body: 'Enter your first and last name (please, not just initials), your cell phone, and a few questions about your household. Then tap “{submit}”.',
					},
					textUpdates: {
						title: 'Get text updates',
						body: 'Once you’re signed up, tap “{action}” on this screen. It’s optional, but without it you won’t get any texts.',
					},
					lottery: {
						time: '10:45 AM',
						title: 'The lottery draws',
						body: 'Everyone has the same chance. This screen shows whether you got a number. Not everyone gets a number each week.',
					},
					line: {
						title: 'Your place in line',
						body: 'If you got a number, head to the market. This screen shows your place in line, like this, and updates on its own.',
					},
					turn: {
						time: '11:30 AM',
						title: 'Shopping begins',
						body: 'When it’s your turn, this screen will say so, and we’ll text you if you signed up for texts. Come to the check-in desk, and bring the phone you signed up on — we can’t accept screenshots.',
					},
					help: {
						title: 'Need a reminder?',
						body: '“{help}” has every step.',
					},
					replay: {
						title: 'See this again',
						body: 'You can take this tour again anytime from this menu.',
					},
				},
			},
			forms: {
				informationLegend: 'Your information',
				pronunciationOffer: 'Add how to say your name',
				pronunciationLabel: 'Sounds like',
				pronunciationHelp: 'Write it the way it sounds, so we can call your name correctly.',
				pronunciationCollapse: 'Hide how to say your name',
				lotteryLegend: 'Lottery entry details',
				questionsLegend: 'Questions',
				seniorsHint: 'Include yourself if you’re 55 or older',
				exceedsHousehold:
					'Children and seniors together can’t be more than the people in your household.',
				noAdult: 'Your household must include at least one adult.',
				savedHousehold: {
					eyebrow: 'From your last visit',
					heading: 'Is this still right?',
					confirm: 'Yes, still right',
					change: 'Change',
					confirmed: 'Household confirmed',
					prompt: 'Check your household, then tap “Yes, still right” or “Change”.',
					changeHeading: 'Update Your Household',
					update: 'Update',
					cancel: 'Cancel',
					close: 'Close',
				},
				joinSteps: {
					label: 'Before you join',
					confirmHousehold: 'Confirm your household',
					householdConfirmed: 'Household confirmed',
					answerQuestions: 'Answer this week’s questions',
					questionsAnswered: 'Questions answered',
				},
				countErrors: {
					required: 'Enter a number.',
					notWholeNumber: 'Enter a whole number, like 2.',
					outOfRange: 'Enter a number from {min} to {max}.',
				},
			},
			identityIndicator: {
				cancelForgetInformation: 'Cancel',
				closeForgetDialog: 'Close forget information confirmation',
				closeNotificationsDialog: 'Close text message updates',
				forgetDialogDescription:
					'This removes your saved name, phone number, device ID, and household details from this device. This cannot be undone.',
				forgetDialogTitle: 'Forget your information?',
				forgetInformation: 'Forget Information',
				heading: 'Recognized on this device',
				notificationsAction: 'Text Me About Updates',
				notificationsDialogTitle: 'Text Message Updates',
				notificationsEnabled: 'Notifications Enabled',
				notificationsError:
					'We could not retrieve your notification status. Please try again later.',
				notificationsLoading: 'Checking notification status…',
				openIdentityMenu: 'Open identity menu',
				optOut: 'Opt Out',
				optOutError: 'We could not opt you out of text updates. Please try again.',
				saveInformationAction: 'Save my information',
				unidentifiedHeading: 'Save your information for next time',
				unidentifiedMessage:
					'Save your name and phone number so you do not need to enter them again on your next visit. This does not enter you in the lottery.',
			},
			notificationOptIn: {
				consentLabel:
					'I agree to receive text messages from The Bay Compassion about my queue and visit status. Message frequency varies, typically no more than a few messages per market day. Message and data rates may apply. Reply STOP to unsubscribe or HELP for assistance. Consent is not required to receive food market service.',
				enable: 'Enable text updates',
				enabled: 'Text message updates are enabled for this and future visits.',
				error: 'We could not enable text updates. Please try again.',
				optedOut:
					'You previously stopped text messages. To receive updates again, send START to our number.',
				sendStart: 'Open a text with START',
				checkStart: 'I sent START — check again',
			},
			scheduleInformation: {
				heading: 'Registration opens every Saturday at 10:30 AM',
				body: outdent`
					Sign-ups are not open yet. Please come back on Saturday at 10:30 AM.
					Everyone will have a fair chance to enter the queue lottery.
				`,
			},
			notOpenState: {
				heading: 'The Market Is Closed',
				subheading:
					'Registration will open again next Saturday at 10:30 AM and stay open for 15 minutes, until 10:45 AM.',
				lotteryDescription:
					'Because supplies are limited, the market uses a lottery system to randomly select shoppers each week. You may register for the lottery from anywhere, at any time during the 15 minutes from 10:30 AM to 10:45 AM on Saturday. Registering early does not affect your chances of being selected, so there is no need to rush.',
				selectionDescription:
					'The lottery will run at 10:45 AM, which leaves time to travel to the market if you are selected. If you are selected to shop, you will receive a number here in the app, and shopping begins at 11:30 AM. If you consent to receiving text messages, you will also be notified by text message.',
			},
			registrationClosedState: {
				heading: 'Registration has closed',
				description:
					'We’re sorry — you missed today’s sign-up window. Registration opens again next Saturday at 10:30 AM, and everyone who registers has an equal chance in the lottery.',
			},
			serviceState: {
				inProgressHeading: 'Today’s market is underway',
				inProgressDescription:
					'Registration is closed for today. Registration will open again next Saturday at 10:30 AM and stay open for 15 minutes, until 10:45 AM. Everyone who signs up has the same chance.',
			},
			refreshNotice: {
				countdown: 'Updating in {seconds}s',
				updating: 'Updating…',
				noNeedToRefresh: 'No need to refresh — this page updates on its own.',
				accessibleDescription: 'This page updates automatically. You do not need to refresh it.',
			},
			visitStatus: {
				yourNumberLabel: 'Your number',
				labels: {
					registered: 'Registered',
					waiting: 'Waiting',
					called: 'Called',
					served: 'Served',
					not_placed: 'Not placed',
					no_show: 'No show',
					cancelled: 'Cancelled',
				},
				registered: {
					header: 'You’re in the lottery!',
					details:
						'When registration closes, the lottery is drawn and your result appears here. If you signed up for texts, we’ll text you too.',
				},
				waiting: {
					header: 'You got a number!',
					details:
						'Head to the market now if you’re not already on-site. We’ll tell you here when it’s your turn.',
					guestsAheadLabel: 'Guests ahead of you',
					youAreNext: 'You are next',
					nowCallingLabel: 'Now calling',
					nowCallingNone: 'Calling starts at 11:30 AM',
				},
				called: {
					header: 'Come to check-in now',
					headerLate: 'Please hurry to check-in',
					details: 'It’s your turn. Bring this phone to the check-in desk.',
					detailsLate:
						'Your number was called. Others are waiting behind you, so please come to the check-in desk now.',
					calledMinutesAgoOne: 'Called 1 minute ago',
					calledMinutesAgoOther: 'Called {minutes} minutes ago',
				},
				served: {
					header: 'Thank you for coming',
					details:
						'Your visit today is complete. Registration opens again next Saturday at 10:30 AM.',
				},
				not_placed: {
					header: 'Sorry, not this time',
					details:
						'You weren’t picked in today’s lottery. It’s completely random, and supplies are limited. We hope to see you next Saturday. Registration opens at 10:30 AM.',
				},
				no_show: {
					header: 'Your number was called',
					details:
						'We couldn’t find you at the check-in desk. If you’re still at the market, please go there now and ask a team member for help.',
				},
				cancelled: {
					header: 'Your visit is cancelled',
					details:
						'You won’t be called today. If this happened by mistake, please see a team member. Registration opens again next Saturday at 10:30 AM.',
				},
				cancelAction: 'Cancel this visit',
				cancelConfirmation: 'Cancel your place in the queue for this visit?',
				cancelConfirm: 'Yes, cancel my visit',
				cancelDismiss: 'Keep my place',
				updateError: 'We could not update this visit. Please ask a market team member for help.',
			},
		},
		admin: 'Admin',
		adminDescription: 'Queue management tools are coming soon.',
		adminTitle: 'A simpler way to welcome every neighbor.',
		age: 'Age',
		agePlaceholder: 'Select your age range',
		ageRange0to17: '0–17',
		ageRange18to29: '18–29',
		ageRange30to44: '30–44',
		ageRange45to59: '45–59',
		ageRange60to74: '60–74',
		ageRange75plus: '75+',
		authConfigurationDescription:
			'Add the Auth0 environment variables through the Netlify Auth0 extension, then redeploy the site.',
		authConfigurationRequired: 'Admin sign-in is not configured',
		authError: 'We could not verify your admin session. Please try signing in again.',
		authLoading: 'Verifying your admin session…',
		backToGuest: 'Back to guest check-in',
		childrenCount: 'Number of children you’re shopping for',
		countDecrementLabel: 'Decrease count',
		countIncrementLabel: 'Increase count',
		chooseAnswer: 'Choose an answer',
		signupView: {
			formDescription:
				'Save your name and phone number so you do not need to enter them again on your next visit. This does not enter you in the lottery or save a place in line.',
			formTitle: 'Save your information for next time',
			submit: 'Save my information',
			submitting: 'Saving…',
			successDescription:
				'You will not need to enter it again on your next visit. You have not entered the lottery or saved a place in line.',
			successTitle: 'Your information is saved',
		},
		claimView: {
			title: 'Set up this phone',
			description:
				'A staff member added you. Set up this phone to see your status and get updates here.',
			replaceHeading: 'Saved information will be replaced',
			replaceWarning:
				'This phone already has saved information or a visit. Setting it up for you replaces it, and it can’t be recovered.',
			submit: 'Set up this phone',
			submitting: 'Setting up…',
			failed: 'This code has expired or was already used. Ask a staff member for a new one.',
			missingCode:
				'This link is missing its code. Ask a staff member to show you the QR code again.',
		},
		kiosk: {
			nowCalling: 'Now calling',
			nowCallingNone: 'No numbers called yet',
			stillWaitingFor: 'Already Called',
			waitingCount: 'In line: {count}',
			moreCount: '+{count} more',
			notStarted: 'Numbers will be called here once the market opens',
			ended: 'Today’s market has ended. Thank you for coming!',
			loading: 'Loading the line…',
			reconnecting: 'Reconnecting…',
			fullscreen: 'Full Screen',
		},
		help: {
			title: 'How it works',
			introHeading: 'It’s a lottery now, not a race.',
			introBody: 'Sign up from anywhere. Everyone has the same chance.',
			stepsHeading: 'Every Saturday',
			steps: [
				{
					time: '10:30 AM',
					title: 'Scan the code',
					body: 'Scan from anywhere, even at home. You have 15 minutes, and the screen shows how much time is left.',
				},
				{ title: 'Choose your language', body: 'The app remembers it for next time.' },
				{
					title: 'Fill in the form',
					body: 'Enter your first and last name (please, not just initials), cell phone, and a few questions about your household. There’s no rush, so take your time. Then tap the button to enter the lottery.',
				},
				{
					title: 'Tap “Text Me About Updates”',
					body: 'Optional, but without it you won’t get any texts.',
				},
				{
					time: '10:45 AM',
					title: 'See if you got a number',
					body: 'The lottery draws and your screen shows the result and your place in line. If you got a number, head to the market. Not everyone gets a number each week.',
				},
				{
					time: '11:30 AM',
					title: 'Shopping begins',
					body: 'When it’s your turn, we’ll text you (if you did step 4) and your screen will say so. Come to the check-in desk.',
				},
			],
			phoneNotice: {
				heading: 'Please bring the phone you signed up on.',
				body: 'We can’t accept screenshots.',
			},
		},
		firstName: 'First name',
		formDescription: 'A few details help us prepare your visit.',
		formTitle: 'Tell us about you',
		guest: 'Guest',
		household: 'Number of people in your household',
		householdHint: 'Include yourself',
		lastName: 'Last name',
		language: 'Language',
		languagePrompt: 'Choose your language',
		marketName: 'The Bay Compassion',
		notifications: {
			registered: {
				title: 'Registration confirmed',
				body: 'Your registration is confirmed.',
			},
			registrationClosed: {
				title: 'Registration closed',
				body: 'Registration has closed. The lottery will begin soon.',
			},
			selected: {
				title: 'You were selected',
				body: 'You were selected. Please wait until you are called.',
			},
			notSelected: {
				title: 'Lottery result',
				body: 'You were not selected for today’s service.',
			},
			called: {
				title: 'It’s your turn',
				body: 'Please come to the check-in desk now.',
			},
			sms: {
				welcome: 'Welcome! You are now set up to receive text updates.',
				selected: 'You were selected! Your number is {number}. Please wait until you are called.',
				notSelected: 'You were not selected for today’s service.',
				called: 'It’s your turn. Please come to the check-in desk now.',
			},
			pushOptIn: {
				enable: 'Notify me about this visit',
				denied: 'Notifications are blocked. Enable them in your device settings.',
				enabled: 'Notifications are enabled for this visit.',
				error: 'We could not enable notifications. Please try again.',
				iosInstall:
					'On iPhone or iPad, add this app to your Home Screen before enabling notifications.',
				unsupported: 'Push notifications are not available on this device.',
			},
		},
		seniorsCount: 'Number of seniors (55+) you’re shopping for',
		phone: 'Phone number',
		privacy: 'Your information is only used to help us serve you.',
		privacyPolicy: 'Privacy Policy',
		qrCodeDescription:
			'Scan this code with a phone camera, or visit the link below, to open the check-in page.',
		qrCodeImageAlt: 'QR code that links to the check-in page',
		qrCodePrint: 'Print',
		qrCodeTitle: 'Scan to check in',
		registrationClosesIn: 'Registration closes in',
		registrationClosesInMinutes: 'Registration closes in {minutes} min',
		submissionError: 'We could not save your check-in. Please try again.',
		submit: 'Join the lottery',
		submitting: 'Joining the lottery…',
		termsAndConditions: 'Terms & Conditions',
		statusLoading: 'Checking today’s market status…',
		welcome: 'Welcome to the community food market',
	},
	es: {
		appError: {
			heading: 'Algo salió mal',
			description:
				'La app tuvo un problema y no pudo mostrar esta página. Volver a cargarla suele solucionarlo.',
			reload: 'Volver a cargar',
		},
		holdingPage: {
			heading: 'La nueva aplicación se lanza el 31 de octubre',
			instructions: 'Guarde este código QR y vuelva a escanearlo el 31 de octubre.',
			currentAppHeading: '¿Busca el mercado de alimentos de hoy?',
			currentAppDescription:
				'Use la aplicación actual hasta el 31 de octubre. Este código QR es para la nueva aplicación.',
			currentAppLink: 'Abrir la aplicación actual',
		},
		appBar: {
			openMenu: 'Abrir menú',
			accountMenu: 'Menú de la cuenta',
			website: 'Sitio web de The Bay Compassion',
			qrCode: 'Código QR',
			staffLogin: 'Acceso del personal',
			adminPanel: 'Panel de administración',
			signOut: 'Cerrar sesión',
			sendFeedback: 'Enviar comentarios',
			deviceDetails: {
				title: 'Detalles del dispositivo',
				close: 'Cerrar detalles del dispositivo',
				installIdLabel: 'ID del dispositivo',
				deviceTokenLabel: 'Token de invitado',
				deviceTokenHint: 'Compártalo solo con un miembro del personal.',
				copy: 'Copiar',
				copied: 'Copiado',
				copyInstallId: 'Copiar ID del dispositivo',
				copyDeviceToken: 'Copiar token de invitado',
				copyError: 'No pudimos copiarlo. Inténtelo de nuevo.',
			},
			takeTour: 'Ver el recorrido',
			colorMode: {
				title: 'Apariencia',
				close: 'Cerrar ajustes de apariencia',
				system: 'Igual que el dispositivo',
				light: 'Claro',
				dark: 'Oscuro',
			},
			feedbackForm: {
				formTitle: 'Enviar comentarios',
				nameLabel: 'Nombre (opcional)',
				namePlaceholder: 'Su nombre',
				messageLabel: 'Sus comentarios',
				messagePlaceholder:
					'Cuéntenos qué salió mal o qué podríamos mejorar. Por favor, no incluya datos personales.',
				submitButtonLabel: 'Enviar',
				cancelButtonLabel: 'Cancelar',
				successMessageText: '¡Gracias por sus comentarios!',
				isRequiredLabel: '(obligatorio)',
				errorEmptyMessageText: 'Escriba un mensaje antes de enviar.',
				errorTimeoutText: 'El envío tardó demasiado. Inténtelo de nuevo.',
				errorGenericText: 'No se pudieron enviar sus comentarios. Inténtelo de nuevo.',
			},
		},
		guestView: {
			presentation: {
				watch: 'Ver la guía para visitantes',
				close: 'Cerrar la guía para visitantes',
				title: 'Guía del mercado para visitantes',
				heading: 'Su visita a The Bay Compassion',
				summary: 'Una breve guía para visitantes el día del mercado.',
				description:
					'Aprenda a inscribirse, consultar el resultado del sorteo, seguir su número y acudir a la mesa de registro.',
				play: 'Reproducir',
				pause: 'Pausar',
				restart: 'Reiniciar',
				fullscreen: 'Pantalla completa',
				exitFullscreen: 'Salir de pantalla completa',
				soundOn: 'Sonido activado',
				soundOff: 'Sonido desactivado',
				noSound: 'Sin sonido',
				musicOn: 'Música activada',
				musicOff: 'Música desactivada',
				volume: 'Volumen',
				seek: 'Ir a un momento',
				open: 'Abrir presentación',
				download: 'Descargar presentación',
				more: 'Más presentaciones',
				chapter: 'Capítulo',
				previousChapter: 'Capítulo anterior',
				nextChapter: 'Capítulo siguiente',
				stepByStep: 'Paso a paso',
				stepByStepHint: 'Pausar al final de cada capítulo',
				chapters: {
					welcome: 'Bienvenida',
					openPage: 'Abra la página del mercado',
					signUpTime: 'Cuándo registrarse',
					form: 'Llene el formulario',
					entered: 'Está participando en el sorteo',
					draw: 'El sorteo',
					followLine: 'Siga la fila',
					yourTurn: 'Es su turno',
					runningLate: 'Si llega tarde',
					complete: 'Visita completada',
					missedSignUp: 'Si no alcanzó a registrarse',
					help: 'Cómo pedir ayuda',
				},
			},
			languageHint:
				'Puede cambiar el idioma en cualquier momento en la parte superior de la pantalla.',
			helpPrompt: '¿No sabe qué hacer?',
			tour: {
				progress: '{current} de {total}',
				start: 'Muéstreme',
				next: 'Siguiente',
				back: 'Atrás',
				skip: 'Saltar recorrido',
				done: 'Listo',
				close: 'Cerrar recorrido',
				steps: {
					welcome: {
						title: '¡Bienvenido! Así funciona',
						body: 'No hay prisa. La inscripción está abierta 15 minutos, e inscribirse temprano no cambia sus posibilidades. Puede saltar este recorrido y volver a verlo cuando quiera desde el menú.',
					},
					language: {
						title: 'Su idioma',
						body: 'Toque aquí para cambiar su idioma cuando quiera. La app lo recordará la próxima vez.',
					},
					countdown: {
						time: '10:30 a. m.',
						title: 'Abre la inscripción',
						body: 'Todos los sábados a las 10:30 a. m., la inscripción abre por 15 minutos. Puede inscribirse desde cualquier lugar, incluso desde casa. Mientras está abierta, un reloj en esta pantalla muestra cuánto tiempo queda.',
					},
					form: {
						title: 'Llene el formulario',
						body: 'Escriba su nombre y apellido (por favor, no solo iniciales), su celular y unas preguntas sobre su hogar. Luego toque “{submit}”.',
					},
					textUpdates: {
						title: 'Reciba mensajes de texto',
						body: 'Después de inscribirse, toque “{action}” en esta pantalla. Es opcional, pero sin esto no recibirá mensajes de texto.',
					},
					lottery: {
						time: '10:45 a. m.',
						title: 'Se hace el sorteo',
						body: 'Todos tienen la misma oportunidad. Esta pantalla muestra si obtuvo un número. No todos obtienen número cada semana.',
					},
					line: {
						title: 'Su lugar en la fila',
						body: 'Si obtuvo un número, venga al mercado. Esta pantalla muestra su lugar en la fila, así, y se actualiza sola.',
					},
					turn: {
						time: '11:30 a. m.',
						title: 'Empiezan las compras',
						body: 'Cuando sea su turno, esta pantalla se lo dirá, y le enviaremos un texto si se inscribió para recibirlos. Acérquese a la mesa de registro y traiga el teléfono con el que se inscribió; no aceptamos capturas de pantalla.',
					},
					help: {
						title: '¿Necesita recordarlo?',
						body: '“{help}” tiene todos los pasos.',
					},
					replay: {
						title: 'Véalo de nuevo',
						body: 'Puede volver a ver este recorrido cuando quiera desde este menú.',
					},
				},
			},
			forms: {
				informationLegend: 'Su información',
				pronunciationOffer: 'Agregar cómo se pronuncia su nombre',
				pronunciationLabel: 'Suena como',
				pronunciationHelp: 'Escríbalo como suena, para que podamos decir su nombre correctamente.',
				pronunciationCollapse: 'Ocultar cómo se pronuncia su nombre',
				lotteryLegend: 'Datos de inscripción al sorteo',
				questionsLegend: 'Preguntas',
				seniorsHint: 'Inclúyase si tiene 55 años o más',
				exceedsHousehold:
					'Los niños y las personas mayores juntos no pueden ser más que las personas de su hogar.',
				noAdult: 'Su hogar debe incluir al menos un adulto.',
				savedHousehold: {
					eyebrow: 'De su última visita',
					heading: '¿Sigue siendo correcto?',
					confirm: 'Sí, es correcto',
					change: 'Cambiar',
					confirmed: 'Hogar confirmado',
					prompt: 'Revise los datos de su hogar y toque «Sí, es correcto» o «Cambiar».',
					changeHeading: 'Actualice los datos de su hogar',
					update: 'Actualizar',
					cancel: 'Cancelar',
					close: 'Cerrar',
				},
				joinSteps: {
					label: 'Antes de unirse',
					confirmHousehold: 'Confirme su hogar',
					householdConfirmed: 'Hogar confirmado',
					answerQuestions: 'Responda las preguntas de esta semana',
					questionsAnswered: 'Preguntas respondidas',
				},
				countErrors: {
					required: 'Escriba un número.',
					notWholeNumber: 'Escriba un número entero, como 2.',
					outOfRange: 'Escriba un número del {min} al {max}.',
				},
			},
			identityIndicator: {
				cancelForgetInformation: 'Cancelar',
				closeForgetDialog: 'Cerrar confirmación para olvidar información',
				closeNotificationsDialog: 'Cerrar actualizaciones por SMS',
				forgetDialogDescription:
					'Esto elimina de este dispositivo su nombre, número de teléfono, ID del dispositivo y los detalles de su hogar guardados. Esta acción no se puede deshacer.',
				forgetDialogTitle: '¿Olvidar su información?',
				forgetInformation: 'Olvidar información',
				heading: 'Reconocido en este dispositivo',
				notificationsAction: 'Enviarme novedades por SMS',
				notificationsDialogTitle: 'Actualizaciones por SMS',
				notificationsEnabled: 'Notificaciones activadas',
				notificationsError:
					'No pudimos consultar el estado de sus notificaciones. Inténtelo de nuevo más tarde.',
				notificationsLoading: 'Consultando el estado de las notificaciones…',
				openIdentityMenu: 'Abrir menú de identidad',
				optOut: 'Cancelar suscripción',
				optOutError: 'No pudimos cancelar sus actualizaciones por SMS. Inténtelo de nuevo.',
				saveInformationAction: 'Guardar mi información',
				unidentifiedHeading: 'Guarde su información para la próxima vez',
				unidentifiedMessage:
					'Guarde su nombre y número de teléfono para no tener que ingresarlos de nuevo en su próxima visita. Esto no le inscribe en el sorteo.',
			},
			notificationOptIn: {
				consentLabel:
					'Acepto recibir mensajes de texto de The Bay Compassion sobre mi lugar en la fila y el estado de mi visita. La frecuencia varía; normalmente no recibiré más de unos pocos mensajes por día de mercado. Pueden aplicarse tarifas de mensajes y datos. Responda STOP para cancelar o HELP para recibir ayuda. El consentimiento no es necesario para recibir servicio en el mercado de alimentos.',
				enable: 'Activar actualizaciones por mensaje de texto',
				enabled:
					'Las actualizaciones por mensaje de texto están activadas para esta visita y futuras visitas.',
				error: 'No pudimos activar las actualizaciones por mensaje de texto. Inténtelo de nuevo.',
				optedOut:
					'Anteriormente pidió dejar de recibir mensajes de texto. Para volver a recibir actualizaciones, envíe START a nuestro número.',
				sendStart: 'Abrir un mensaje con START',
				checkStart: 'Ya envié START — comprobar de nuevo',
			},
			scheduleInformation: {
				heading: 'El registro abre todos los sábados a las 10:30 a. m.',
				body: outdent`
					Las inscripciones aún no están abiertas. Vuelva el sábado a las 10:30 a. m.
					Todos tendrán una oportunidad justa de participar en el sorteo de la fila.
				`,
			},
			notOpenState: {
				heading: 'El mercado está cerrado',
				subheading:
					'La inscripción volverá a abrir el próximo sábado a las 10:30 a. m. y permanecerá abierta 15 minutos, hasta las 10:45 a. m.',
				lotteryDescription:
					'Debido a que los suministros son limitados, el mercado utiliza un sistema de lotería para seleccionar al azar a las personas que podrán comprar cada semana. Puede inscribirse en la lotería desde cualquier lugar, en cualquier momento durante los 15 minutos entre las 10:30 a. m. y las 10:45 a. m. del sábado. Inscribirse temprano no afecta sus probabilidades de ser seleccionado, por lo que no hay prisa.',
				selectionDescription:
					'La lotería se realizará a las 10:45 a. m., lo que le da tiempo de llegar al mercado si es seleccionado. Si es seleccionado para comprar, recibirá un número aquí en la aplicación, y las compras comienzan a las 11:30 a. m. Si acepta recibir mensajes de texto, también recibirá una notificación por mensaje de texto.',
			},
			registrationClosedState: {
				heading: 'El registro ha cerrado',
				description:
					'Lo sentimos: no alcanzó a inscribirse dentro del horario de hoy. El registro volverá a abrir el próximo sábado a las 10:30 a. m., y todas las personas que se inscriban tienen las mismas probabilidades en el sorteo.',
			},
			serviceState: {
				inProgressHeading: 'El mercado de hoy está en curso',
				inProgressDescription:
					'El registro está cerrado por hoy. La inscripción volverá a abrir el próximo sábado a las 10:30 a. m. y permanecerá abierta 15 minutos, hasta las 10:45 a. m. Todos los que se inscriben tienen la misma oportunidad.',
			},
			refreshNotice: {
				countdown: 'Se actualizará en {seconds} s',
				updating: 'Actualizando…',
				noNeedToRefresh: 'No es necesario actualizar: esta página se actualiza sola.',
				accessibleDescription:
					'Esta página se actualiza automáticamente. No es necesario que la actualice.',
			},
			visitStatus: {
				yourNumberLabel: 'Su número',
				labels: {
					registered: 'Registrado',
					waiting: 'En espera',
					called: 'Llamado',
					served: 'Atendido',
					not_placed: 'Sin lugar',
					no_show: 'No se presentó',
					cancelled: 'Cancelado',
				},
				registered: {
					header: '¡Está participando en el sorteo!',
					details:
						'Cuando cierre el registro, se hará el sorteo y su resultado aparecerá aquí. Si se inscribió para recibir mensajes de texto, también le enviaremos un mensaje.',
				},
				waiting: {
					header: '¡Obtuvo un número!',
					details:
						'Diríjase al mercado ahora si todavía no está aquí. Le avisaremos aquí cuando sea su turno.',
					guestsAheadLabel: 'Invitados delante de usted',
					youAreNext: 'Usted es el siguiente',
					nowCallingLabel: 'Llamando ahora',
					nowCallingNone: 'Los llamados empiezan a las 11:30 a. m.',
				},
				called: {
					header: 'Acérquese al registro ahora',
					headerLate: 'Por favor, venga pronto al registro',
					details: 'Es su turno. Traiga este teléfono a la mesa de registro.',
					detailsLate:
						'Ya llamamos su número. Otras personas esperan detrás de usted, así que por favor acérquese a la mesa de registro ahora.',
					calledMinutesAgoOne: 'Le llamamos hace 1 minuto',
					calledMinutesAgoOther: 'Le llamamos hace {minutes} minutos',
				},
				served: {
					header: 'Gracias por venir',
					details:
						'Su visita de hoy ha terminado. El registro volverá a abrir el próximo sábado a las 10:30 a. m.',
				},
				not_placed: {
					header: 'Lo sentimos, esta vez no',
					details:
						'No fue elegido en el sorteo de hoy. Es completamente al azar y los suministros son limitados. Esperamos verle el próximo sábado. El registro abre a las 10:30 a. m.',
				},
				no_show: {
					header: 'Llamamos su número',
					details:
						'No lo encontramos en la mesa de registro. Si todavía está en el mercado, vaya allí ahora y pida ayuda a un miembro del equipo.',
				},
				cancelled: {
					header: 'Su visita está cancelada',
					details:
						'Hoy no le llamaremos. Si esto fue un error, hable con un miembro del equipo. El registro volverá a abrir el próximo sábado a las 10:30 a. m.',
				},
				cancelAction: 'Cancelar esta visita',
				cancelConfirmation: '¿Cancelar su lugar en la fila para esta visita?',
				cancelConfirm: 'Sí, cancelar mi visita',
				cancelDismiss: 'Conservar mi lugar',
				updateError: 'No pudimos actualizar esta visita. Pida ayuda al equipo del mercado.',
			},
		},
		admin: 'Administración',
		adminDescription: 'Las herramientas para gestionar la fila estarán disponibles pronto.',
		adminTitle: 'Una forma más sencilla de recibir a cada vecino.',
		age: 'Edad',
		agePlaceholder: 'Seleccione su rango de edad',
		ageRange0to17: '0–17',
		ageRange18to29: '18–29',
		ageRange30to44: '30–44',
		ageRange45to59: '45–59',
		ageRange60to74: '60–74',
		ageRange75plus: '75+',
		authConfigurationDescription:
			'Agregue las variables de entorno de Auth0 mediante la extensión Auth0 de Netlify y vuelva a implementar el sitio.',
		authConfigurationRequired: 'El inicio de sesión de administración no está configurado',
		authError: 'No pudimos verificar su sesión de administración. Intente iniciar sesión de nuevo.',
		authLoading: 'Verificando su sesión de administración…',
		backToGuest: 'Volver al registro',
		childrenCount: 'Número de niños para quienes está comprando',
		countDecrementLabel: 'Disminuir el número',
		countIncrementLabel: 'Aumentar el número',
		chooseAnswer: 'Elija una respuesta',
		signupView: {
			formDescription:
				'Guarde su nombre y número de teléfono para no tener que ingresarlos de nuevo en su próxima visita. Esto no le inscribe en el sorteo ni reserva un lugar en la fila.',
			formTitle: 'Guarde su información para la próxima vez',
			submit: 'Guardar mi información',
			submitting: 'Guardando…',
			successDescription:
				'No tendrá que ingresarla de nuevo en su próxima visita. No se ha inscrito en el sorteo ni ha reservado un lugar en la fila.',
			successTitle: 'Su información está guardada',
		},
		claimView: {
			title: 'Configure este teléfono',
			description:
				'Un miembro del personal lo registró. Configure este teléfono para ver su estado y recibir actualizaciones aquí.',
			replaceHeading: 'Se reemplazará la información guardada',
			replaceWarning:
				'Este teléfono ya tiene información guardada o una visita. Al configurarlo para usted, se reemplazará y no se podrá recuperar.',
			submit: 'Configurar este teléfono',
			submitting: 'Configurando…',
			failed: 'Este código venció o ya se usó. Pida uno nuevo a un miembro del personal.',
			missingCode:
				'A este enlace le falta el código. Pida a un miembro del personal que le muestre el código QR de nuevo.',
		},
		kiosk: {
			nowCalling: 'Llamando ahora',
			nowCallingNone: 'Aún no se ha llamado ningún número',
			stillWaitingFor: 'Ya llamados',
			waitingCount: 'En la fila: {count}',
			moreCount: '+{count} más',
			notStarted: 'Los números se llamarán aquí cuando abra el mercado',
			ended: 'El mercado de hoy ha terminado. ¡Gracias por venir!',
			loading: 'Cargando la fila…',
			reconnecting: 'Reconectando…',
			fullscreen: 'Pantalla completa',
		},
		help: {
			title: 'Cómo funciona',
			introHeading: 'Ahora es un sorteo, no una carrera.',
			introBody: 'Inscríbase desde cualquier lugar. Todos tienen la misma oportunidad.',
			stepsHeading: 'Todos los sábados',
			steps: [
				{
					time: '10:30 a. m.',
					title: 'Escanee el código',
					body: 'Hágalo desde cualquier lugar, incluso desde casa. Tiene 15 minutos y la pantalla muestra cuánto tiempo queda.',
				},
				{ title: 'Elija su idioma', body: 'La app lo recordará la próxima vez.' },
				{
					title: 'Llene el formulario',
					body: 'Escriba su nombre y apellido (por favor, no solo iniciales), su celular y unas preguntas sobre su hogar. No hay prisa, tómese su tiempo. Luego toque el botón para participar en el sorteo.',
				},
				{
					title: 'Toque “Enviarme novedades por SMS”',
					body: 'Es opcional, pero sin esto no recibirá mensajes de texto.',
				},
				{
					time: '10:45 a. m.',
					title: 'Vea si obtuvo un número',
					body: 'Su pantalla muestra el resultado y su lugar en la fila. Si obtuvo un número, venga al mercado. No todos obtienen número cada semana.',
				},
				{
					time: '11:30 a. m.',
					title: 'Empiezan las compras',
					body: 'Cuando sea su turno, le avisaremos por texto (si hizo el paso 4) y en su pantalla. Acérquese a la mesa de registro.',
				},
			],
			phoneNotice: {
				heading: 'Por favor, traiga el teléfono con el que se inscribió.',
				body: 'No aceptamos capturas de pantalla.',
			},
		},
		firstName: 'Nombre',
		formDescription: 'Unos detalles nos ayudan a preparar su visita.',
		formTitle: 'Cuéntenos sobre usted',
		guest: 'Invitado',
		household: 'Número de personas en su hogar',
		householdHint: 'Inclúyase',
		lastName: 'Apellido',
		language: 'Idioma',
		languagePrompt: 'Elija su idioma',
		marketName: 'The Bay Compassion',
		notifications: {
			registered: {
				title: 'Registro confirmado',
				body: 'Su registro está confirmado.',
			},
			registrationClosed: {
				title: 'Registro cerrado',
				body: 'El registro cerró. El sorteo comenzará pronto.',
			},
			selected: {
				title: 'Fue seleccionado',
				body: 'Fue seleccionado. Espere hasta que le llamemos.',
			},
			notSelected: {
				title: 'Resultado del sorteo',
				body: 'No fue seleccionado para el servicio de hoy.',
			},
			called: {
				title: 'Es su turno',
				body: 'Por favor, acérquese a la mesa de registro ahora.',
			},
			sms: {
				welcome: '¡Le damos la bienvenida! Ya recibirá actualizaciones por mensaje de texto.',
				selected: '¡Fue seleccionado! Su número es el {number}. Espere hasta que le llamemos.',
				notSelected: 'No fue seleccionado para el servicio de hoy.',
				called: 'Es su turno. Por favor, acérquese a la mesa de registro ahora.',
			},
			pushOptIn: {
				enable: 'Notificarme sobre esta visita',
				denied:
					'Las notificaciones están bloqueadas. Actívelas en la configuración de su dispositivo.',
				enabled: 'Las notificaciones están activadas para esta visita.',
				error: 'No pudimos activar las notificaciones. Inténtelo de nuevo.',
				iosInstall:
					'En iPhone o iPad, agregue esta aplicación a la pantalla de inicio antes de activar las notificaciones.',
				unsupported: 'Las notificaciones push no están disponibles en este dispositivo.',
			},
		},
		seniorsCount: 'Número de personas mayores (55+) para quienes está comprando',
		phone: 'Número de teléfono',
		privacy: 'Su información solo se utiliza para atenderle.',
		privacyPolicy: 'Política de privacidad',
		qrCodeDescription:
			'Escanee este código con la cámara de un teléfono, o visite el enlace de abajo, para abrir la página de registro.',
		qrCodeImageAlt: 'Código QR que enlaza a la página de registro',
		qrCodePrint: 'Imprimir',
		qrCodeTitle: 'Escanee para registrarse',
		registrationClosesIn: 'El registro cierra en',
		registrationClosesInMinutes: 'El registro cierra en {minutes} min',
		submissionError: 'No pudimos guardar su registro. Inténtelo de nuevo.',
		submit: 'Unirse al sorteo',
		submitting: 'Uniéndose al sorteo…',
		termsAndConditions: 'Términos y condiciones',
		statusLoading: 'Consultando el estado del mercado de hoy…',
		welcome: 'Bienvenido al mercado comunitario de alimentos',
	},
	fa: {
		appError: {
			heading: 'مشکلی پیش آمد',
			description:
				'برنامه با مشکلی روبه‌رو شد و نتوانست این صفحه را نشان دهد. معمولاً بارگذاری دوباره مشکل را حل می‌کند.',
			reload: 'بارگذاری دوباره',
		},
		holdingPage: {
			heading: 'برنامهٔ جدید در ۳۱ اکتبر راه‌اندازی می‌شود',
			instructions: 'این کد QR را نگه دارید و در ۳۱ اکتبر دوباره اسکن کنید.',
			currentAppHeading: 'دنبال بازار مواد غذایی امروز هستید؟',
			currentAppDescription:
				'تا ۳۱ اکتبر از برنامهٔ فعلی استفاده کنید. این کد QR برای برنامهٔ جدید است.',
			currentAppLink: 'باز کردن برنامهٔ فعلی',
		},
		appBar: {
			openMenu: 'باز کردن منو',
			accountMenu: 'منوی حساب کاربری',
			website: 'وب‌سایت The Bay Compassion',
			qrCode: 'کد QR',
			staffLogin: 'ورود کارکنان',
			adminPanel: 'پنل مدیریت',
			signOut: 'خروج',
			sendFeedback: 'ارسال بازخورد',
			deviceDetails: {
				title: 'جزئیات دستگاه',
				close: 'بستن جزئیات دستگاه',
				installIdLabel: 'شناسه دستگاه',
				deviceTokenLabel: 'توکن مهمان',
				deviceTokenHint: 'این را فقط با یکی از کارکنان به اشتراک بگذارید.',
				copy: 'کپی',
				copied: 'کپی شد',
				copyInstallId: 'کپی شناسه دستگاه',
				copyDeviceToken: 'کپی توکن مهمان',
				copyError: 'کپی نشد. لطفاً دوباره تلاش کنید.',
			},
			takeTour: 'دیدن راهنمای گام‌به‌گام',
			colorMode: {
				title: 'ظاهر',
				close: 'بستن تنظیمات ظاهر',
				system: 'مطابق تنظیمات دستگاه',
				light: 'روشن',
				dark: 'تیره',
			},
			feedbackForm: {
				formTitle: 'ارسال بازخورد',
				nameLabel: 'نام (اختیاری)',
				namePlaceholder: 'نام شما',
				messageLabel: 'بازخورد شما',
				messagePlaceholder:
					'به ما بگویید چه مشکلی پیش آمد یا چه چیزی می‌تواند بهتر شود. لطفاً اطلاعات شخصی وارد نکنید.',
				submitButtonLabel: 'ارسال',
				cancelButtonLabel: 'لغو',
				successMessageText: 'از بازخورد شما سپاسگزاریم!',
				isRequiredLabel: '(الزامی)',
				errorEmptyMessageText: 'لطفاً پیش از ارسال، پیامی بنویسید.',
				errorTimeoutText: 'ارسال بیش از حد طول کشید. لطفاً دوباره تلاش کنید.',
				errorGenericText: 'بازخورد شما ارسال نشد. لطفاً دوباره تلاش کنید.',
			},
		},
		guestView: {
			presentation: {
				watch: 'تماشای راهنمای مهمان',
				close: 'بستن راهنمای مهمان',
				title: 'راهنمای بازار برای مهمانان',
				heading: 'بازدید شما از The Bay Compassion',
				summary: 'راهنمایی کوتاه برای مهمانان در روز بازار.',
				description:
					'با ثبت‌نام، دیدن نتیجهٔ قرعه‌کشی، پیگیری شمارهٔ خود و رفتن به میز پذیرش آشنا شوید.',
				play: 'پخش',
				pause: 'مکث',
				restart: 'شروع دوباره',
				fullscreen: 'تمام‌صفحه',
				exitFullscreen: 'خروج از تمام‌صفحه',
				soundOn: 'صدا روشن',
				soundOff: 'صدا خاموش',
				noSound: 'بدون صدا',
				musicOn: 'موسیقی روشن',
				musicOff: 'موسیقی خاموش',
				volume: 'بلندی صدا',
				seek: 'رفتن به زمان',
				open: 'باز کردن ارائه',
				download: 'دریافت ارائه',
				more: 'ارائه‌های بیشتر',
				chapter: 'بخش',
				previousChapter: 'بخش قبلی',
				nextChapter: 'بخش بعدی',
				stepByStep: 'گام به گام',
				stepByStepHint: 'توقف در پایان هر بخش',
				chapters: {
					welcome: 'خوش آمدید',
					openPage: 'صفحهٔ بازارچه را باز کنید',
					signUpTime: 'زمان ثبت‌نام',
					form: 'پر کردن فرم',
					entered: 'شما در قرعه‌کشی هستید',
					draw: 'قرعه‌کشی',
					followLine: 'دنبال کردن صف',
					yourTurn: 'نوبت شماست',
					runningLate: 'اگر دیر می‌رسید',
					complete: 'پایان مراجعه',
					missedSignUp: 'اگر ثبت‌نام را از دست دادید',
					help: 'دریافت کمک',
				},
			},
			languageHint: 'هر زمان بخواهید می‌توانید زبان را از بالای صفحه تغییر دهید.',
			helpPrompt: 'نمی‌دانید چه کار کنید؟',
			tour: {
				progress: '{current} از {total}',
				start: 'نشانم بده',
				next: 'بعدی',
				back: 'قبلی',
				skip: 'رد شدن از راهنما',
				done: 'تمام',
				close: 'بستن راهنما',
				steps: {
					welcome: {
						title: 'خوش آمدید! این‌طور کار می‌کند',
						body: 'عجله نکنید. ثبت‌نام ۱۵ دقیقه باز است و ثبت‌نام زودتر شانس شما را تغییر نمی‌دهد. می‌توانید از این راهنما رد شوید و هر زمان از منو دوباره آن را ببینید.',
					},
					language: {
						title: 'زبان شما',
						body: 'هر زمان خواستید برای تغییر زبان اینجا بزنید. اپ آن را برای دفعه بعد به خاطر می‌سپارد.',
					},
					countdown: {
						time: '۱۰:۳۰ صبح',
						title: 'ثبت‌نام باز می‌شود',
						body: 'هر شنبه ساعت ۱۰:۳۰ صبح، ثبت‌نام برای ۱۵ دقیقه باز می‌شود. از هر جایی، حتی خانه، می‌توانید ثبت‌نام کنید. تا وقتی باز است، یک زمان‌سنج در این صفحه زمان باقی‌مانده را نشان می‌دهد.',
					},
					form: {
						title: 'فرم را پر کنید',
						body: 'نام و نام خانوادگی کامل (لطفاً نه فقط حروف اول)، تلفن همراه و پاسخ چند سؤال درباره خانوار را وارد کنید. سپس روی «{submit}» بزنید.',
					},
					textUpdates: {
						title: 'دریافت پیامک',
						body: 'بعد از ثبت‌نام، در این صفحه روی «{action}» بزنید. اختیاری است، اما بدون آن پیامکی نمی‌گیرید.',
					},
					lottery: {
						time: '۱۰:۴۵ صبح',
						title: 'قرعه‌کشی انجام می‌شود',
						body: 'شانس همه برابر است. این صفحه نشان می‌دهد شماره گرفته‌اید یا نه. هر هفته همه شماره نمی‌گیرند.',
					},
					line: {
						title: 'جایگاه شما در صف',
						body: 'اگر شماره گرفتید، به بازار بیایید. این صفحه جایگاهتان در صف را این‌طور نشان می‌دهد و خودش به‌روز می‌شود.',
					},
					turn: {
						time: '۱۱:۳۰ صبح',
						title: 'شروع خرید',
						body: 'وقتی نوبتتان شد، این صفحه نشان می‌دهد و اگر برای پیامک ثبت‌نام کرده باشید، پیامک هم می‌فرستیم. به میز پذیرش بیایید و همان تلفنی را که با آن ثبت‌نام کردید بیاورید — اسکرین‌شات پذیرفته نمی‌شود.',
					},
					help: {
						title: 'یادآوری لازم دارید؟',
						body: 'همه مراحل در «{help}» هست.',
					},
					replay: {
						title: 'دوباره ببینید',
						body: 'هر زمان خواستید می‌توانید این راهنما را از همین منو دوباره ببینید.',
					},
				},
			},
			forms: {
				informationLegend: 'اطلاعات شما',
				pronunciationOffer: 'افزودن تلفظ نام شما',
				pronunciationLabel: 'تلفظ',
				pronunciationHelp: 'آن را همان‌طور که خوانده می‌شود بنویسید تا نام شما را درست صدا بزنیم.',
				pronunciationCollapse: 'پنهان کردن تلفظ نام شما',
				lotteryLegend: 'جزئیات ورود به قرعه‌کشی',
				questionsLegend: 'پرسش‌ها',
				seniorsHint: 'اگر ۵۵ سال یا بیشتر دارید، خودتان را هم حساب کنید',
				exceedsHousehold: 'مجموع کودکان و سالمندان نمی‌تواند از تعداد افراد خانواده شما بیشتر باشد.',
				noAdult: 'خانواده شما باید دست‌کم یک بزرگسال داشته باشد.',
				savedHousehold: {
					eyebrow: 'از مراجعهٔ قبلی شما',
					heading: 'آیا این اطلاعات هنوز درست است؟',
					confirm: 'بله، درست است',
					change: 'تغییر',
					confirmed: 'اطلاعات خانوار تأیید شد',
					prompt: 'اطلاعات خانوار خود را بررسی کنید و سپس «بله، درست است» یا «تغییر» را بزنید.',
					changeHeading: 'به‌روزرسانی اطلاعات خانوار',
					update: 'به‌روزرسانی',
					cancel: 'لغو',
					close: 'بستن',
				},
				joinSteps: {
					label: 'پیش از پیوستن',
					confirmHousehold: 'اطلاعات خانوار را تأیید کنید',
					householdConfirmed: 'اطلاعات خانوار تأیید شد',
					answerQuestions: 'به پرسش‌های این هفته پاسخ دهید',
					questionsAnswered: 'به پرسش‌ها پاسخ داده شد',
				},
				countErrors: {
					required: 'یک عدد وارد کنید.',
					notWholeNumber: 'یک عدد صحیح وارد کنید، مثلاً ۲.',
					outOfRange: 'عددی از {min} تا {max} وارد کنید.',
				},
			},
			identityIndicator: {
				cancelForgetInformation: 'لغو',
				closeForgetDialog: 'بستن تأیید فراموش کردن اطلاعات',
				closeNotificationsDialog: 'بستن به‌روزرسانی‌های پیامکی',
				forgetDialogDescription:
					'این کار نام، شماره تلفن، شناسه دستگاه و اطلاعات خانوار ذخیره‌شده شما را از این دستگاه حذف می‌کند و قابل بازگشت نیست.',
				forgetDialogTitle: 'اطلاعات شما فراموش شود؟',
				forgetInformation: 'فراموش کردن اطلاعات',
				heading: 'شناسایی‌شده در این دستگاه',
				notificationsAction: 'به‌روزرسانی‌ها را برایم پیامک کنید',
				notificationsDialogTitle: 'به‌روزرسانی‌های پیامکی',
				notificationsEnabled: 'اعلان‌ها فعال هستند',
				notificationsError: 'وضعیت اعلان‌های شما دریافت نشد. لطفاً بعداً دوباره تلاش کنید.',
				notificationsLoading: 'در حال بررسی وضعیت اعلان‌ها…',
				openIdentityMenu: 'باز کردن منوی هویت',
				optOut: 'لغو اشتراک',
				optOutError: 'لغو به‌روزرسانی‌های پیامکی انجام نشد. لطفاً دوباره تلاش کنید.',
				saveInformationAction: 'ذخیره اطلاعات من',
				unidentifiedHeading: 'اطلاعات خود را برای دفعه بعد ذخیره کنید',
				unidentifiedMessage:
					'نام و شماره تلفن خود را ذخیره کنید تا در مراجعه بعدی نیازی به وارد کردن دوباره آن‌ها نداشته باشید. این کار شما را وارد قرعه‌کشی نمی‌کند.',
			},
			notificationOptIn: {
				consentLabel:
					'موافقم پیامک‌هایی از The Bay Compassion درباره جایگاهم در صف و وضعیت این مراجعه دریافت کنم. تعداد پیام‌ها متغیر است و معمولاً از چند پیام در هر روز بازار بیشتر نمی‌شود. ممکن است هزینه پیامک و داده اعمال شود. برای لغو اشتراک STOP و برای راهنمایی HELP را پاسخ دهید. رضایت به دریافت پیامک برای دریافت خدمات بازار مواد غذایی الزامی نیست.',
				enable: 'فعال‌کردن به‌روزرسانی‌های پیامکی',
				enabled: 'به‌روزرسانی‌های پیامکی برای این مراجعه و مراجعه‌های آینده فعال شدند.',
				error: 'نتوانستیم به‌روزرسانی‌های پیامکی را فعال کنیم. لطفاً دوباره تلاش کنید.',
				optedOut:
					'شما قبلاً پیامک‌ها را متوقف کرده‌اید. برای دریافت دوباره به‌روزرسانی‌ها، START را به شماره ما بفرستید.',
				sendStart: 'باز کردن پیامک با START',
				checkStart: 'START را فرستادم — دوباره بررسی کنید',
			},
			scheduleInformation: {
				heading: 'ثبت‌نام هر شنبه ساعت ۱۰:۳۰ صبح باز می‌شود',
				body: outdent`
					ثبت‌نام هنوز باز نشده است. لطفاً روز شنبه ساعت ۱۰:۳۰ صبح دوباره مراجعه کنید.
					همه فرصتی برابر برای ورود به قرعه‌کشی صف خواهند داشت.
				`,
			},
			notOpenState: {
				heading: 'بازار بسته است',
				subheading:
					'ثبت‌نام شنبه آینده ساعت ۱۰:۳۰ صبح دوباره آغاز می‌شود و ۱۵ دقیقه، تا ساعت ۱۰:۴۵ صبح، باز می‌ماند.',
				lotteryDescription:
					'به دلیل محدود بودن اقلام، بازار برای انتخاب تصادفی خریداران هر هفته از سیستم قرعه‌کشی استفاده می‌کند. می‌توانید از هر جایی و در هر زمانی از بازه ۱۵ دقیقه‌ای روز شنبه، از ساعت ۱۰:۳۰ تا ۱۰:۴۵ صبح، برای قرعه‌کشی ثبت‌نام کنید. ثبت‌نام زودتر تأثیری بر شانس انتخاب شدن شما ندارد، بنابراین نیازی به عجله نیست.',
				selectionDescription:
					'قرعه‌کشی ساعت ۱۰:۴۵ صبح انجام می‌شود تا اگر انتخاب شدید، فرصت رسیدن به بازار را داشته باشید. اگر برای خرید انتخاب شوید، در همین برنامه یک شماره دریافت خواهید کرد و خرید از ساعت ۱۱:۳۰ صبح آغاز می‌شود. اگر با دریافت پیامک موافقت کرده باشید، از طریق پیامک نیز به شما اطلاع داده می‌شود.',
			},
			registrationClosedState: {
				heading: 'ثبت‌نام بسته شده است',
				description:
					'متأسفیم؛ شما بازه ثبت‌نام امروز را از دست دادید. ثبت‌نام شنبه آینده ساعت ۱۰:۳۰ صبح دوباره آغاز می‌شود و همه کسانی که ثبت‌نام کنند شانس برابری در قرعه‌کشی دارند.',
			},
			serviceState: {
				inProgressHeading: 'بازار امروز در حال برگزاری است',
				inProgressDescription:
					'ثبت‌نام برای امروز بسته شده است. ثبت‌نام شنبه آینده ساعت ۱۰:۳۰ صبح دوباره آغاز می‌شود و ۱۵ دقیقه، تا ساعت ۱۰:۴۵ صبح، باز می‌ماند. شانس همه کسانی که ثبت‌نام می‌کنند برابر است.',
			},
			refreshNotice: {
				countdown: 'به‌روزرسانی تا {seconds} ثانیه دیگر',
				updating: 'در حال به‌روزرسانی…',
				noNeedToRefresh: 'نیازی به تازه‌سازی نیست؛ این صفحه خودش به‌روز می‌شود.',
				accessibleDescription: 'این صفحه به‌طور خودکار به‌روز می‌شود. لازم نیست آن را تازه‌سازی کنید.',
			},
			visitStatus: {
				yourNumberLabel: 'شمارهٔ شما',
				labels: {
					registered: 'ثبت‌شده',
					waiting: 'در انتظار',
					called: 'فراخوانده‌شده',
					served: 'خدمت‌رسانی‌شده',
					not_placed: 'انتخاب‌نشده',
					no_show: 'غایب',
					cancelled: 'لغوشده',
				},
				registered: {
					header: 'شما در قرعه‌کشی هستید!',
					details:
						'وقتی ثبت‌نام بسته شود، قرعه‌کشی انجام می‌شود و نتیجهٔ شما همین‌جا نمایش داده می‌شود. اگر برای دریافت پیامک ثبت‌نام کرده باشید، برایتان پیامک هم می‌فرستیم.',
				},
				waiting: {
					header: 'شما شماره گرفتید!',
					details:
						'اگر هنوز در محل نیستید، همین حالا به بازار بیایید. وقتی نوبت شما شد، همین‌جا به شما اطلاع می‌دهیم.',
					guestsAheadLabel: 'مهمانان جلوتر از شما',
					youAreNext: 'شما نفر بعدی هستید',
					nowCallingLabel: 'در حال فراخوانی',
					nowCallingNone: 'فراخوانی ساعت ۱۱:۳۰ صبح شروع می‌شود',
				},
				called: {
					header: 'همین حالا به پذیرش بیایید',
					headerLate: 'لطفاً زودتر به پذیرش بیایید',
					details: 'نوبت شماست. همین گوشی را به میز پذیرش بیاورید.',
					detailsLate:
						'شمارهٔ شما فراخوانده شد. دیگران پشت سر شما منتظرند، پس لطفاً همین حالا به میز پذیرش بیایید.',
					calledMinutesAgoOne: 'یک دقیقه پیش فراخوانده شدید',
					calledMinutesAgoOther: '{minutes} دقیقه پیش فراخوانده شدید',
				},
				served: {
					header: 'از حضورتان سپاسگزاریم',
					details:
						'بازدید امروز شما به پایان رسید. ثبت‌نام شنبه آینده ساعت ۱۰:۳۰ صبح دوباره آغاز می‌شود.',
				},
				not_placed: {
					header: 'متأسفیم، این بار نه',
					details:
						'شما در قرعه‌کشی امروز انتخاب نشدید. قرعه‌کشی کاملاً تصادفی است و اقلام محدود است. امیدواریم شنبهٔ آینده شما را ببینیم. ثبت‌نام ساعت ۱۰:۳۰ صبح باز می‌شود.',
				},
				no_show: {
					header: 'شمارهٔ شما فراخوانده شد',
					details:
						'شما را در میز پذیرش پیدا نکردیم. اگر هنوز در بازار هستید، لطفاً همین حالا به آنجا بروید و از یکی از اعضای تیم کمک بخواهید.',
				},
				cancelled: {
					header: 'بازدید شما لغو شده است',
					details:
						'امروز شمارهٔ شما فراخوانده نمی‌شود. اگر این اشتباهی رخ داده است، لطفاً با یکی از اعضای تیم صحبت کنید. ثبت‌نام شنبهٔ آینده ساعت ۱۰:۳۰ صبح دوباره باز می‌شود.',
				},
				cancelAction: 'لغو این بازدید',
				cancelConfirmation: 'جای خود را در صف این بازدید لغو می‌کنید؟',
				cancelConfirm: 'بله، بازدید من لغو شود',
				cancelDismiss: 'جای من محفوظ بماند',
				updateError: 'این بازدید به‌روزرسانی نشد. از یکی از اعضای تیم بازار کمک بخواهید.',
			},
		},
		admin: 'مدیریت',
		adminDescription: 'ابزارهای مدیریت صف به‌زودی در دسترس خواهند بود.',
		adminTitle: 'راهی ساده‌تر برای خوشامدگویی به هر همسایه.',
		age: 'سن',
		agePlaceholder: 'محدوده سنی خود را انتخاب کنید',
		ageRange0to17: '۰ تا ۱۷',
		ageRange18to29: '۱۸ تا ۲۹',
		ageRange30to44: '۳۰ تا ۴۴',
		ageRange45to59: '۴۵ تا ۵۹',
		ageRange60to74: '۶۰ تا ۷۴',
		ageRange75plus: '۷۵ به بالا',
		authConfigurationDescription:
			'متغیرهای محیطی Auth0 را از طریق افزونه Auth0 نتلیفای اضافه کنید و سپس سایت را دوباره منتشر کنید.',
		authConfigurationRequired: 'ورود مدیر پیکربندی نشده است',
		authError: 'نتوانستیم نشست مدیریت شما را تأیید کنیم. لطفاً دوباره وارد شوید.',
		authLoading: 'در حال تأیید نشست مدیریت…',
		backToGuest: 'بازگشت به ثبت‌نام مهمان',
		childrenCount: 'تعداد کودکانی که برای آن‌ها خرید می‌کنید',
		countDecrementLabel: 'کاهش تعداد',
		countIncrementLabel: 'افزایش تعداد',
		chooseAnswer: 'یک پاسخ انتخاب کنید',
		signupView: {
			formDescription:
				'نام و شماره تلفن خود را ذخیره کنید تا در مراجعه بعدی نیازی به وارد کردن دوباره آن‌ها نداشته باشید. این کار شما را وارد قرعه‌کشی نمی‌کند و جایی در صف رزرو نمی‌کند.',
			formTitle: 'اطلاعات خود را برای دفعه بعد ذخیره کنید',
			submit: 'ذخیره اطلاعات من',
			submitting: 'در حال ذخیره…',
			successDescription:
				'در مراجعه بعدی نیازی به وارد کردن دوباره آن‌ها ندارید. شما وارد قرعه‌کشی نشده‌اید و جایی در صف رزرو نکرده‌اید.',
			successTitle: 'اطلاعات شما ذخیره شد',
		},
		claimView: {
			title: 'راه‌اندازی این تلفن',
			description:
				'یکی از کارکنان شما را ثبت کرده است. این تلفن را راه‌اندازی کنید تا وضعیت خود را ببینید و به‌روزرسانی‌ها را همین‌جا دریافت کنید.',
			replaceHeading: 'اطلاعات ذخیره‌شده جایگزین می‌شود',
			replaceWarning:
				'این تلفن از قبل اطلاعات ذخیره‌شده یا یک مراجعه دارد. با راه‌اندازی آن برای شما، این اطلاعات جایگزین می‌شود و قابل بازیابی نیست.',
			submit: 'راه‌اندازی این تلفن',
			submitting: 'در حال راه‌اندازی…',
			failed: 'این کد منقضی شده یا قبلاً استفاده شده است. از یکی از کارکنان کد جدیدی بخواهید.',
			missingCode: 'این پیوند کد ندارد. از یکی از کارکنان بخواهید دوباره کد QR را به شما نشان دهد.',
		},
		kiosk: {
			nowCalling: 'در حال فراخوانی',
			nowCallingNone: 'هنوز شماره‌ای فراخوانده نشده است',
			stillWaitingFor: 'فراخوانده‌شده',
			waitingCount: 'در صف: {count}',
			moreCount: 'شماره‌های دیگر: {count}',
			notStarted: 'پس از باز شدن بازار، شماره‌ها اینجا اعلام می‌شوند',
			ended: 'بازار امروز به پایان رسید. از حضور شما سپاسگزاریم!',
			loading: 'در حال بارگیری صف…',
			reconnecting: 'در حال اتصال دوباره…',
			fullscreen: 'تمام‌صفحه',
		},
		help: {
			title: 'چطور کار می‌کند',
			introHeading: 'حالا قرعه‌کشی است، نه مسابقه.',
			introBody: 'از هر جایی ثبت‌نام کنید. شانس همه برابر است.',
			stepsHeading: 'هر شنبه',
			steps: [
				{
					time: '۱۰:۳۰ صبح',
					title: 'کد را اسکن کنید',
					body: 'از هر جایی، حتی خانه. ۱۵ دقیقه وقت دارید و صفحه زمان باقی‌مانده را نشان می‌دهد.',
				},
				{ title: 'زبان خود را انتخاب کنید', body: 'اپ آن را برای دفعه بعد به خاطر می‌سپارد.' },
				{
					title: 'فرم را پر کنید',
					body: 'نام و نام خانوادگی کامل (لطفاً نه فقط حروف اول)، تلفن همراه و پاسخ چند سؤال درباره خانوار را وارد کنید. عجله نکنید. سپس دکمه را بزنید تا در قرعه‌کشی شرکت کنید.',
				},
				{
					title: 'روی «به‌روزرسانی‌ها را برایم پیامک کنید» بزنید',
					body: 'اختیاری است، اما بدون آن پیامکی نمی‌گیرید.',
				},
				{
					time: '۱۰:۴۵ صبح',
					title: 'ببینید شماره گرفته‌اید یا نه',
					body: 'صفحه نتیجه و جایگاهتان در صف را نشان می‌دهد. اگر شماره گرفتید، به بازار بیایید. هر هفته همه شماره نمی‌گیرند.',
				},
				{
					time: '۱۱:۳۰ صبح',
					title: 'شروع خرید',
					body: 'وقتی نوبتتان شد، پیامک می‌فرستیم (اگر مرحله ۴ را انجام داده‌اید) و صفحه هم نشان می‌دهد. به میز پذیرش بیایید.',
				},
			],
			phoneNotice: {
				heading: 'لطفاً همان تلفنی را که با آن ثبت‌نام کردید بیاورید.',
				body: 'اسکرین‌شات پذیرفته نمی‌شود.',
			},
		},
		firstName: 'نام',
		formDescription: 'چند اطلاعات به ما کمک می‌کند تا برای بازدید شما آماده شویم.',
		formTitle: 'درباره خودتان بگویید',
		guest: 'مهمان',
		household: 'تعداد افراد خانواده شما',
		householdHint: 'خودتان را هم حساب کنید',
		lastName: 'نام خانوادگی',
		language: 'زبان',
		languagePrompt: 'زبان خود را انتخاب کنید',
		marketName: 'The Bay Compassion',
		notifications: {
			registered: {
				title: 'ثبت‌نام تأیید شد',
				body: 'ثبت‌نام شما تأیید شد.',
			},
			registrationClosed: {
				title: 'ثبت‌نام بسته شد',
				body: 'ثبت‌نام بسته شد. قرعه‌کشی به‌زودی آغاز می‌شود.',
			},
			selected: {
				title: 'شما انتخاب شدید',
				body: 'شما انتخاب شدید. لطفاً تا زمان فراخوان منتظر بمانید.',
			},
			notSelected: {
				title: 'نتیجه قرعه‌کشی',
				body: 'شما برای خدمات امروز انتخاب نشدید.',
			},
			called: {
				title: 'نوبت شماست',
				body: 'لطفاً همین حالا به میز پذیرش مراجعه کنید.',
			},
			sms: {
				welcome: 'خوش آمدید! از این پس به‌روزرسانی‌ها را با پیامک دریافت می‌کنید.',
				selected: 'شما انتخاب شدید! شمارهٔ شما {number} است. لطفاً تا زمان فراخوان منتظر بمانید.',
				notSelected: 'شما برای خدمات امروز انتخاب نشدید.',
				called: 'نوبت شماست. لطفاً همین حالا به میز پذیرش مراجعه کنید.',
			},
			pushOptIn: {
				enable: 'درباره این مراجعه به من اطلاع دهید',
				denied: 'اعلان‌ها مسدود هستند. آن‌ها را در تنظیمات دستگاه فعال کنید.',
				enabled: 'اعلان‌ها برای این مراجعه فعال شدند.',
				error: 'نتوانستیم اعلان‌ها را فعال کنیم. لطفاً دوباره تلاش کنید.',
				iosInstall:
					'در آیفون یا آیپد، پیش از فعال کردن اعلان‌ها این برنامه را به صفحه اصلی اضافه کنید.',
				unsupported: 'اعلان‌های فوری در این دستگاه در دسترس نیستند.',
			},
		},
		seniorsCount: 'تعداد سالمندان (۵۵ به بالا) که برای آن‌ها خرید می‌کنید',
		phone: 'شماره تلفن',
		privacy: 'اطلاعات شما فقط برای کمک به خدمت‌رسانی به شما استفاده می‌شود.',
		privacyPolicy: 'سیاست حفظ حریم خصوصی',
		qrCodeDescription:
			'این کد را با دوربین گوشی اسکن کنید یا از پیوند زیر بازدید کنید تا صفحه ثبت‌نام باز شود.',
		qrCodeImageAlt: 'کد QR که به صفحه ثبت‌نام پیوند دارد',
		qrCodePrint: 'چاپ',
		qrCodeTitle: 'برای ثبت‌نام اسکن کنید',
		registrationClosesIn: 'زمان باقی‌مانده برای ثبت‌نام',
		registrationClosesInMinutes: 'ثبت‌نام تا {minutes} دقیقه دیگر بسته می‌شود',
		submissionError: 'ثبت‌نام شما ذخیره نشد. لطفاً دوباره تلاش کنید.',
		submit: 'پیوستن به قرعه‌کشی',
		submitting: 'در حال پیوستن به قرعه‌کشی…',
		termsAndConditions: 'شرایط و ضوابط',
		statusLoading: 'در حال بررسی وضعیت بازار امروز…',
		welcome: 'به بازار غذای جامعه خوش آمدید',
	},
	tl: {
		appError: {
			heading: 'Nagkaproblema',
			description:
				'Nagkaproblema ang app at hindi maipakita ang pahinang ito. Kadalasang naaayos ito kapag ni-reload.',
			reload: 'I-reload',
		},
		holdingPage: {
			heading: 'Ilulunsad ang bagong app sa Oktubre 31',
			instructions: 'Itago ang QR code na ito at i-scan itong muli sa Oktubre 31.',
			currentAppHeading: 'Hinahanap ang food market ngayong araw?',
			currentAppDescription:
				'Gamitin ang kasalukuyang app hanggang Oktubre 31. Ang QR code na ito ay para sa bagong app.',
			currentAppLink: 'Buksan ang kasalukuyang app',
		},
		appBar: {
			openMenu: 'Buksan ang menu',
			accountMenu: 'Menu ng account',
			website: 'Website ng The Bay Compassion',
			qrCode: 'Kodigo QR',
			staffLogin: 'Mag-sign in para sa kawani',
			adminPanel: 'Panel ng admin',
			signOut: 'Mag-sign out',
			sendFeedback: 'Magpadala ng puna',
			deviceDetails: {
				title: 'Mga detalye ng device',
				close: 'Isara ang mga detalye ng device',
				installIdLabel: 'ID ng Device',
				deviceTokenLabel: 'Token ng bisita',
				deviceTokenHint: 'Ibahagi lamang ito sa isang staff.',
				copy: 'Kopyahin',
				copied: 'Nakopya',
				copyInstallId: 'Kopyahin ang device ID',
				copyDeviceToken: 'Kopyahin ang token ng bisita',
				copyError: 'Hindi namin ito makopya. Pakisubukang muli.',
			},
			takeTour: 'Panoorin ang tour',
			colorMode: {
				title: 'Hitsura',
				close: 'Isara ang mga setting ng hitsura',
				system: 'Katulad ng Device',
				light: 'Maliwanag',
				dark: 'Madilim',
			},
			feedbackForm: {
				formTitle: 'Magpadala ng puna',
				nameLabel: 'Pangalan (opsyonal)',
				namePlaceholder: 'Iyong pangalan',
				messageLabel: 'Ang iyong puna',
				messagePlaceholder:
					'Sabihin sa amin ang nangyaring problema o ang maaaring pagbutihin. Huwag maglagay ng personal na impormasyon.',
				submitButtonLabel: 'Ipadala',
				cancelButtonLabel: 'Kanselahin',
				successMessageText: 'Salamat sa iyong puna!',
				isRequiredLabel: '(kinakailangan)',
				errorEmptyMessageText: 'Mangyaring magsulat ng mensahe bago magpadala.',
				errorTimeoutText: 'Tumagal nang sobra ang pagpapadala. Pakisubukang muli.',
				errorGenericText: 'Hindi naipadala ang iyong puna. Pakisubukang muli.',
			},
		},
		guestView: {
			presentation: {
				watch: 'Manood ng Gabay para sa Bisita',
				close: 'Isara ang gabay para sa bisita',
				title: 'Gabay sa palengke para sa mga bisita',
				heading: 'Ang iyong pagbisita sa The Bay Compassion',
				summary: 'Isang maikling gabay para sa mga bisita sa araw ng palengke.',
				description:
					'Alamin kung paano magparehistro, tingnan ang resulta ng bunutan, subaybayan ang iyong numero, at pumunta sa check-in desk.',
				play: 'I-play',
				pause: 'I-pause',
				restart: 'Magsimulang muli',
				fullscreen: 'Buong screen',
				exitFullscreen: 'Lumabas sa buong screen',
				soundOn: 'May tunog',
				soundOff: 'Walang tunog',
				noSound: 'Walang audio',
				musicOn: 'May musika',
				musicOff: 'Walang musika',
				volume: 'Lakas ng tunog',
				seek: 'Pumunta sa oras',
				open: 'Buksan ang presentasyon',
				download: 'I-download ang presentasyon',
				more: 'Iba pang presentasyon',
				chapter: 'Kabanata',
				previousChapter: 'Nakaraang kabanata',
				nextChapter: 'Susunod na kabanata',
				stepByStep: 'Hakbang-hakbang',
				stepByStepHint: 'Huminto sa dulo ng bawat kabanata',
				chapters: {
					welcome: 'Maligayang pagdating',
					openPage: 'Buksan ang pahina ng market',
					signUpTime: 'Kailan magparehistro',
					form: 'Sagutan ang form',
					entered: 'Kasali na kayo sa lottery',
					draw: 'Ang bunutan ng lottery',
					followLine: 'Sundan ang pila',
					yourTurn: 'Kayo na po ang susunod',
					runningLate: 'Kung mahuhuli kayo',
					complete: 'Tapos na ang pagbisita',
					missedSignUp: 'Kung hindi kayo nakapagparehistro',
					help: 'Paghingi ng tulong',
				},
			},
			languageHint: 'Maaari mong palitan ang wika anumang oras sa itaas ng screen.',
			helpPrompt: 'Hindi sigurado kung ano ang gagawin?',
			tour: {
				progress: '{current} sa {total}',
				start: 'Ipakita',
				next: 'Susunod',
				back: 'Bumalik',
				skip: 'Laktawan ang tour',
				done: 'Tapos na',
				close: 'Isara ang tour',
				steps: {
					welcome: {
						title: 'Maligayang pagdating! Ganito ito gumagana',
						body: 'Walang pagmamadali. Bukas ang sign-up nang 15 minuto, at hindi nagbabago ang tsansa ninyo kung maaga kayong mag-sign up. Maaari ninyong laktawan ang tour na ito at balikan anumang oras mula sa menu.',
					},
					language: {
						title: 'Ang inyong wika',
						body: 'Pindutin dito para palitan ang wika anumang oras. Tatandaan ito ng app sa susunod.',
					},
					countdown: {
						time: '10:30 AM',
						title: 'Bukas na ang sign-up',
						body: 'Tuwing Sabado nang 10:30 AM, bukas ang sign-up nang 15 minuto. Maaari kayong mag-sign up kahit saan, kahit sa bahay. Habang bukas ito, ipinapakita ng timer sa screen na ito kung gaano katagal pa.',
					},
					form: {
						title: 'Sagutan ang form',
						body: 'Ilagay ang pangalan at apelyido (hindi lang initials, pakiusap), cell phone, at ilang tanong tungkol sa sambahayan. Pagkatapos, pindutin ang “{submit}”.',
					},
					textUpdates: {
						title: 'Tumanggap ng text',
						body: 'Pagkatapos mag-sign up, pindutin ang “{action}” sa screen na ito. Opsyonal ito, pero kung wala ito, hindi kayo makakatanggap ng text.',
					},
					lottery: {
						time: '10:45 AM',
						title: 'Bubunutin ang lottery',
						body: 'Pareho ang tsansa ng lahat. Ipapakita ng screen na ito kung may numero kayo. Hindi lahat may numero bawat linggo.',
					},
					line: {
						title: 'Ang puwesto ninyo sa pila',
						body: 'Kung may numero kayo, pumunta na sa market. Ipinapakita ng screen na ito ang puwesto ninyo sa pila, gaya nito, at kusa itong nag-a-update.',
					},
					turn: {
						time: '11:30 AM',
						title: 'Simula ng pamimili',
						body: 'Kapag turno na ninyo, sasabihin ito ng screen, at ite-text namin kayo kung nag-sign up kayo sa text. Pumunta sa mesa ng check-in at dalhin ang phone na ginamit ninyo sa pag-sign up — hindi tinatanggap ang screenshot.',
					},
					help: {
						title: 'Kailangan ng paalala?',
						body: 'Nasa “{help}” ang bawat hakbang.',
					},
					replay: {
						title: 'Panoorin muli',
						body: 'Maaari ninyong panoorin muli ang tour na ito anumang oras mula sa menu na ito.',
					},
				},
			},
			forms: {
				informationLegend: 'Iyong impormasyon',
				pronunciationOffer: 'Idagdag kung paano bigkasin ang iyong pangalan',
				pronunciationLabel: 'Bigkas',
				pronunciationHelp:
					'Isulat ito ayon sa tunog, para matawag namin nang tama ang iyong pangalan.',
				pronunciationCollapse: 'Itago kung paano bigkasin ang iyong pangalan',
				lotteryLegend: 'Mga detalye ng pagsali sa lottery',
				questionsLegend: 'Mga tanong',
				seniorsHint: 'Isama ang sarili kung 55 taong gulang o higit pa',
				exceedsHousehold:
					'Hindi puwedeng mas marami ang mga bata at senior kaysa sa mga tao sa inyong sambahayan.',
				noAdult: 'Dapat may kahit isang nasa hustong gulang sa inyong sambahayan.',
				savedHousehold: {
					eyebrow: 'Mula sa huli mong pagbisita',
					heading: 'Tama pa ba ito?',
					confirm: 'Oo, tama pa',
					change: 'Baguhin',
					confirmed: 'Nakumpirma ang sambahayan',
					prompt: 'Suriin ang iyong sambahayan, saka i-tap ang “Oo, tama pa” o “Baguhin”.',
					changeHeading: 'I-update ang iyong sambahayan',
					update: 'I-update',
					cancel: 'Kanselahin',
					close: 'Isara',
				},
				joinSteps: {
					label: 'Bago sumali',
					confirmHousehold: 'Kumpirmahin ang iyong sambahayan',
					householdConfirmed: 'Nakumpirma ang sambahayan',
					answerQuestions: 'Sagutin ang mga tanong ngayong linggo',
					questionsAnswered: 'Nasagot na ang mga tanong',
				},
				countErrors: {
					required: 'Maglagay ng numero.',
					notWholeNumber: 'Maglagay ng buong numero, gaya ng 2.',
					outOfRange: 'Maglagay ng numero mula {min} hanggang {max}.',
				},
			},
			identityIndicator: {
				cancelForgetInformation: 'Kanselahin',
				closeForgetDialog: 'Isara ang pagkumpirma sa paglimot ng impormasyon',
				closeNotificationsDialog: 'Isara ang mga update sa text',
				forgetDialogDescription:
					'Aalisin nito sa device na ito ang iyong naka-save na pangalan, numero ng telepono, device ID, at mga detalye ng sambahayan. Hindi ito maaaring ibalik.',
				forgetDialogTitle: 'Kalimutan ang iyong impormasyon?',
				forgetInformation: 'Kalimutan ang Impormasyon',
				heading: 'Nakilala sa device na ito',
				notificationsAction: 'I-text sa Akin ang mga Update',
				notificationsDialogTitle: 'Mga Update sa Text',
				notificationsEnabled: 'Naka-enable ang mga Abiso',
				notificationsError:
					'Hindi namin makuha ang status ng iyong mga abiso. Pakisubukang muli mamaya.',
				notificationsLoading: 'Sinusuri ang status ng mga abiso…',
				openIdentityMenu: 'Buksan ang menu ng pagkakakilanlan',
				optOut: 'Mag-opt Out',
				optOutError: 'Hindi ka namin maalis sa mga text update. Pakisubukang muli.',
				saveInformationAction: 'I-save ang aking impormasyon',
				unidentifiedHeading: 'I-save ang iyong impormasyon para sa susunod',
				unidentifiedMessage:
					'I-save ang iyong pangalan at numero ng telepono para hindi mo na kailangang ilagay muli ang mga ito sa susunod mong pagbisita. Hindi ka nito isinasali sa lottery.',
			},
			notificationOptIn: {
				consentLabel:
					'Sumasang-ayon akong tumanggap ng mga text message mula sa The Bay Compassion tungkol sa puwesto ko sa pila at katayuan ng pagbisitang ito. Nag-iiba ang dalas at karaniwang hindi hihigit sa ilang mensahe bawat araw ng pamilihan. Maaaring may mga bayad sa mensahe at data. Mag-reply ng STOP para mag-unsubscribe o HELP para sa tulong. Hindi kailangang pumayag upang makatanggap ng serbisyo sa pamilihan ng pagkain.',
				enable: 'I-enable ang mga text update',
				enabled:
					'Naka-enable ang mga text message update para sa pagbisitang ito at mga susunod na pagbisita.',
				error: 'Hindi namin ma-enable ang mga text update. Pakisubukang muli.',
				optedOut:
					'Itinigil mo dati ang mga text message. Para makatanggap muli ng mga update, ipadala ang START sa aming numero.',
				sendStart: 'Magbukas ng text na may START',
				checkStart: 'Naipadala ko na ang START — tingnan muli',
			},
			scheduleInformation: {
				heading: 'Nagbubukas ang pagpaparehistro tuwing Sabado nang 10:30 AM',
				body: outdent`
					Hindi pa bukas ang pagpaparehistro. Pakibalik sa Sabado nang 10:30 AM.
					Magkakaroon ang lahat ng patas na pagkakataon na makasali sa lottery ng pila.
				`,
			},
			notOpenState: {
				heading: 'Sarado ang Pamilihan',
				subheading:
					'Magbubukas muli ang pagpaparehistro sa susunod na Sabado nang 10:30 AM at mananatiling bukas nang 15 minuto, hanggang 10:45 AM.',
				lotteryDescription:
					'Dahil limitado ang mga supply, gumagamit ang pamilihan ng sistema ng lottery upang random na pumili ng mga mamimili bawat linggo. Maaari kang magparehistro sa lottery kahit saan, anumang oras sa loob ng 15 minuto mula 10:30 AM hanggang 10:45 AM tuwing Sabado. Hindi naaapektuhan ng maagang pagpaparehistro ang iyong pagkakataong mapili, kaya hindi kailangang magmadali.',
				selectionDescription:
					'Gaganapin ang lottery nang 10:45 AM, kaya may oras kang pumunta sa pamilihan kung mapipili ka. Kung mapipili kang mamili, bibigyan ka ng numero dito sa app, at magsisimula ang pamimili nang 11:30 AM. Kung pumayag kang tumanggap ng mga text message, aabisuhan ka rin sa pamamagitan ng text message.',
			},
			registrationClosedState: {
				heading: 'Sarado na ang pagpaparehistro',
				description:
					'Pasensya na po — hindi na kayo umabot sa oras ng pagpaparehistro ngayong araw. Muling magbubukas ang pagpaparehistro sa Sabado nang 10:30 AM, at pantay ang pagkakataon sa lottery ng lahat ng magpaparehistro.',
			},
			serviceState: {
				inProgressHeading: 'Kasalukuyang nagaganap ang pamilihan ngayon',
				inProgressDescription:
					'Sarado na ang pagpaparehistro para ngayong araw. Magbubukas muli ang pagpaparehistro sa susunod na Sabado nang 10:30 AM at mananatiling bukas nang 15 minuto, hanggang 10:45 AM. Pareho ang tsansa ng lahat ng magsa-sign up.',
			},
			refreshNotice: {
				countdown: 'Mag-a-update sa loob ng {seconds}s',
				updating: 'Ina-update…',
				noNeedToRefresh: 'Hindi na kailangang i-refresh — kusang nag-a-update ang pahinang ito.',
				accessibleDescription:
					'Awtomatikong nag-a-update ang pahinang ito. Hindi mo na kailangang i-refresh.',
			},
			visitStatus: {
				yourNumberLabel: 'Ang inyong numero',
				labels: {
					registered: 'Nakarehistro',
					waiting: 'Naghihintay',
					called: 'Tinawag',
					served: 'Napagsilbihan',
					not_placed: 'Hindi napili',
					no_show: 'Hindi dumating',
					cancelled: 'Kinansela',
				},
				registered: {
					header: 'Kasali na kayo sa lottery!',
					details:
						'Pagsara ng rehistrasyon, bubunutin ang lottery at lalabas dito ang resulta ninyo. Kung nag-sign up kayo para sa mga text, ite-text din namin kayo.',
				},
				waiting: {
					header: 'May numero na kayo!',
					details:
						'Pumunta na po kayo sa pamilihan ngayon kung wala pa kayo rito. Sasabihin namin dito kapag oras na ninyo.',
					guestsAheadLabel: 'Mga bisita bago kayo',
					youAreNext: 'Kayo na ang susunod',
					nowCallingLabel: 'Tinatawag ngayon',
					nowCallingNone: 'Magsisimula ang pagtawag nang 11:30 AM',
				},
				called: {
					header: 'Pumunta na sa check-in ngayon',
					headerLate: 'Magmadali po sa check-in',
					details: 'Kayo na po. Dalhin ang teleponong ito sa mesa ng check-in.',
					detailsLate:
						'Tinawag na po ang inyong numero. May mga naghihintay sa likod ninyo, kaya pumunta na po kayo sa mesa ng check-in ngayon.',
					calledMinutesAgoOne: 'Tinawag kayo 1 minuto na ang nakalipas',
					calledMinutesAgoOther: 'Tinawag kayo {minutes} minuto na ang nakalipas',
				},
				served: {
					header: 'Salamat po sa pagpunta',
					details:
						'Tapos na po ang inyong pagbisita ngayong araw. Muling magbubukas ang pagpaparehistro sa Sabado nang 10:30 AM.',
				},
				not_placed: {
					header: 'Pasensya na po, hindi ngayon',
					details:
						'Hindi kayo napili sa lottery ngayong araw. Ganap itong random, at limitado ang mga supply. Sana makita namin kayo sa susunod na Sabado. Magbubukas ang rehistrasyon nang 10:30 AM.',
				},
				no_show: {
					header: 'Tinawag na ang inyong numero',
					details:
						'Hindi po namin kayo nakita sa mesa ng check-in. Kung nasa pamilihan pa kayo, pumunta na po roon ngayon at humingi ng tulong sa isang miyembro ng pangkat.',
				},
				cancelled: {
					header: 'Kinansela ang inyong pagbisita',
					details:
						'Hindi na po kayo tatawagin ngayong araw. Kung nagkamali ito, makipag-usap po sa isang miyembro ng pangkat. Muling magbubukas ang rehistrasyon sa susunod na Sabado nang 10:30 AM.',
				},
				cancelAction: 'Kanselahin ang pagbisitang ito',
				cancelConfirmation: 'Kanselahin ang iyong puwesto sa pila para sa pagbisitang ito?',
				cancelConfirm: 'Oo, kanselahin ang pagbisita ko',
				cancelDismiss: 'Panatilihin ang puwesto ko',
				updateError: 'Hindi namin ma-update ang pagbisitang ito. Humingi ng tulong sa pangkat.',
			},
		},
		admin: 'Admin',
		adminDescription: 'Darating na ang mga kasangkapan sa pamamahala ng pila.',
		adminTitle: 'Isang mas madaling paraan upang salubungin ang bawat kapitbahay.',
		age: 'Edad',
		agePlaceholder: 'Piliin ang iyong saklaw ng edad',
		ageRange0to17: '0–17',
		ageRange18to29: '18–29',
		ageRange30to44: '30–44',
		ageRange45to59: '45–59',
		ageRange60to74: '60–74',
		ageRange75plus: '75+',
		authConfigurationDescription:
			'Idagdag ang mga Auth0 environment variable gamit ang Netlify Auth0 extension, pagkatapos ay i-deploy muli ang site.',
		authConfigurationRequired: 'Hindi pa naka-configure ang pag-sign in ng admin',
		authError: 'Hindi namin ma-verify ang iyong admin session. Subukang mag-sign in muli.',
		authLoading: 'Vine-verify ang iyong admin session…',
		backToGuest: 'Bumalik sa pag-check in ng bisita',
		childrenCount: 'Bilang ng mga batang binibilhan mo',
		countDecrementLabel: 'Bawasan ang bilang',
		countIncrementLabel: 'Dagdagan ang bilang',
		chooseAnswer: 'Pumili ng sagot',
		signupView: {
			formDescription:
				'I-save ang iyong pangalan at numero ng telepono para hindi mo na kailangang ilagay muli ang mga ito sa susunod mong pagbisita. Hindi ka nito isinasali sa lottery o nirereserbahan ng puwesto sa pila.',
			formTitle: 'I-save ang iyong impormasyon para sa susunod',
			submit: 'I-save ang aking impormasyon',
			submitting: 'Sine-save…',
			successDescription:
				'Hindi mo na ito kailangang ilagay muli sa susunod mong pagbisita. Hindi ka pa kasali sa lottery at wala kang nakareserbang puwesto sa pila.',
			successTitle: 'Naka-save na ang iyong impormasyon',
		},
		claimView: {
			title: 'I-set up ang teleponong ito',
			description:
				'Idinagdag ka ng isang staff. I-set up ang teleponong ito para makita ang iyong status at makatanggap ng mga update dito.',
			replaceHeading: 'Papalitan ang naka-save na impormasyon',
			replaceWarning:
				'May naka-save nang impormasyon o pagbisita ang teleponong ito. Kapag in-set up ito para sa iyo, papalitan ito at hindi na maibabalik.',
			submit: 'I-set up ang teleponong ito',
			submitting: 'Sine-set up…',
			failed: 'Nag-expire na o nagamit na ang code na ito. Humingi ng bago sa isang staff.',
			missingCode:
				'Walang code ang link na ito. Hilingin sa isang staff na ipakita muli ang QR code.',
		},
		kiosk: {
			nowCalling: 'Tinatawag ngayon',
			nowCallingNone: 'Wala pang tinatawag na numero',
			stillWaitingFor: 'Natawag na',
			waitingCount: 'Nasa pila: {count}',
			moreCount: '+{count} pa',
			notStarted: 'Dito tatawagin ang mga numero kapag nagbukas na ang market',
			ended: 'Tapos na ang market ngayong araw. Salamat sa pagpunta!',
			loading: 'Nilo-load ang pila…',
			reconnecting: 'Kumokonekta muli…',
			fullscreen: 'Buong screen',
		},
		help: {
			title: 'Paano ito gumagana',
			introHeading: 'Lottery na ito, hindi paunahan.',
			introBody: 'Mag-sign up kahit saan. Pareho ang tsansa ng lahat.',
			stepsHeading: 'Tuwing Sabado',
			steps: [
				{
					time: '10:30 AM',
					title: 'I-scan ang code',
					body: 'Kahit saan, kahit sa bahay. May 15 minuto kayo, at ipinapakita ng screen kung gaano katagal pa.',
				},
				{ title: 'Piliin ang iyong wika', body: 'Tatandaan ito ng app sa susunod.' },
				{
					title: 'Sagutan ang form',
					body: 'Ilagay ang pangalan at apelyido (hindi lang initials, pakiusap), cell phone, at ilang tanong tungkol sa sambahayan. Walang pagmamadali. Pagkatapos, pindutin ang button para sumali sa lottery.',
				},
				{
					title: 'Pindutin ang “I-text sa Akin ang mga Update”',
					body: 'Opsyonal, pero kung wala ito, hindi kayo makakatanggap ng text.',
				},
				{
					time: '10:45 AM',
					title: 'Alamin kung may numero kayo',
					body: 'Ipapakita ng screen ang resulta at ang puwesto ninyo sa pila. Kung may numero, pumunta na sa market. Hindi lahat may numero bawat linggo.',
				},
				{
					time: '11:30 AM',
					title: 'Simula ng pamimili',
					body: 'Kapag turno na ninyo, ite-text namin kayo (kung ginawa ang hakbang 4) at sasabihin ng screen. Pumunta sa mesa ng check-in.',
				},
			],
			phoneNotice: {
				heading: 'Pakidala ang phone na ginamit ninyo sa pag-sign up.',
				body: 'Hindi tinatanggap ang screenshot.',
			},
		},
		firstName: 'Pangalan',
		formDescription: 'Makakatulong ang ilang detalye upang maihanda namin ang inyong pagbisita.',
		formTitle: 'Sabihin sa amin ang tungkol sa iyo',
		guest: 'Bisita',
		household: 'Bilang ng mga tao sa inyong sambahayan',
		householdHint: 'Isama ang sarili',
		lastName: 'Apelyido',
		language: 'Wika',
		languagePrompt: 'Piliin ang iyong wika',
		marketName: 'The Bay Compassion',
		notifications: {
			registered: {
				title: 'Kumpirmado ang pagpaparehistro',
				body: 'Kumpirmado na ang iyong pagpaparehistro.',
			},
			registrationClosed: {
				title: 'Sarado na ang pagpaparehistro',
				body: 'Sarado na ang pagpaparehistro. Magsisimula na ang lottery.',
			},
			selected: {
				title: 'Napili ka',
				body: 'Napili ka. Mangyaring maghintay hanggang tawagin ka.',
			},
			notSelected: {
				title: 'Resulta ng lottery',
				body: 'Hindi ka napili para sa serbisyo ngayong araw.',
			},
			called: {
				title: 'Oras mo na',
				body: 'Pumunta na po kayo sa mesa ng check-in ngayon.',
			},
			sms: {
				welcome: 'Maligayang pagdating! Makakatanggap ka na ng mga update sa text.',
				selected:
					'Napili ka! Ang iyong numero ay {number}. Mangyaring maghintay hanggang tawagin ka.',
				notSelected: 'Hindi ka napili para sa serbisyo ngayong araw.',
				called: 'Oras mo na. Pumunta na po kayo sa mesa ng check-in ngayon.',
			},
			pushOptIn: {
				enable: 'Abisuhan ako tungkol sa pagbisitang ito',
				denied: 'Naka-block ang mga abiso. I-enable ang mga ito sa settings ng device.',
				enabled: 'Naka-enable ang mga abiso para sa pagbisitang ito.',
				error: 'Hindi namin ma-enable ang mga abiso. Pakisubukang muli.',
				iosInstall:
					'Sa iPhone o iPad, idagdag muna ang app na ito sa Home Screen bago i-enable ang mga abiso.',
				unsupported: 'Hindi available ang mga push notification sa device na ito.',
			},
		},
		seniorsCount: 'Bilang ng mga senior (55+) na binibilhan mo',
		phone: 'Numero ng telepono',
		privacy: 'Ginagamit lamang ang inyong impormasyon upang matulungan namin kayong mapagsilbihan.',
		privacyPolicy: 'Patakaran sa Privacy',
		qrCodeDescription:
			'I-scan ang code na ito gamit ang camera ng telepono, o bisitahin ang link sa ibaba, para buksan ang pahina ng pag-check in.',
		qrCodeImageAlt: 'QR code na naka-link sa pahina ng pag-check in',
		qrCodePrint: 'I-print',
		qrCodeTitle: 'I-scan para mag-check in',
		registrationClosesIn: 'Magsasara ang pagpaparehistro sa loob ng',
		registrationClosesInMinutes: 'Magsasara ang pagpaparehistro sa loob ng {minutes} min',
		submissionError: 'Hindi namin na-save ang inyong check-in. Pakisubukang muli.',
		submit: 'Sumali sa lottery',
		submitting: 'Sumasali sa lottery…',
		termsAndConditions: 'Mga Tuntunin at Kundisyon',
		statusLoading: 'Sinusuri ang katayuan ng palengke ngayon…',
		welcome: 'Maligayang pagdating sa pamilihan ng pagkaing pangkomunidad',
	},
	vi: {
		appError: {
			heading: 'Đã xảy ra sự cố',
			description:
				'Ứng dụng gặp sự cố và không thể hiển thị trang này. Tải lại trang thường sẽ khắc phục được.',
			reload: 'Tải lại',
		},
		holdingPage: {
			heading: 'Ứng dụng mới ra mắt ngày 31 tháng 10',
			instructions: 'Giữ mã QR này và quét lại vào ngày 31 tháng 10.',
			currentAppHeading: 'Bạn đang tìm chợ thực phẩm hôm nay?',
			currentAppDescription:
				'Dùng ứng dụng hiện tại cho đến ngày 31 tháng 10. Mã QR này dành cho ứng dụng mới.',
			currentAppLink: 'Mở ứng dụng hiện tại',
		},
		appBar: {
			openMenu: 'Mở trình đơn',
			accountMenu: 'Trình đơn tài khoản',
			website: 'Trang web The Bay Compassion',
			qrCode: 'Mã QR',
			staffLogin: 'Đăng nhập nhân viên',
			adminPanel: 'Bảng quản trị',
			signOut: 'Đăng xuất',
			sendFeedback: 'Gửi góp ý',
			deviceDetails: {
				title: 'Thông tin thiết bị',
				close: 'Đóng thông tin thiết bị',
				installIdLabel: 'Mã thiết bị',
				deviceTokenLabel: 'Mã khách',
				deviceTokenHint: 'Chỉ chia sẻ mã này với nhân viên.',
				copy: 'Sao chép',
				copied: 'Đã sao chép',
				copyInstallId: 'Sao chép mã thiết bị',
				copyDeviceToken: 'Sao chép mã khách',
				copyError: 'Không thể sao chép. Vui lòng thử lại.',
			},
			takeTour: 'Xem hướng dẫn',
			colorMode: {
				title: 'Giao diện',
				close: 'Đóng cài đặt giao diện',
				system: 'Theo thiết bị',
				light: 'Sáng',
				dark: 'Tối',
			},
			feedbackForm: {
				formTitle: 'Gửi góp ý',
				nameLabel: 'Tên (không bắt buộc)',
				namePlaceholder: 'Tên của bạn',
				messageLabel: 'Góp ý của bạn',
				messagePlaceholder:
					'Hãy cho chúng tôi biết điều gì không ổn hoặc điều gì có thể tốt hơn. Vui lòng không ghi thông tin cá nhân.',
				submitButtonLabel: 'Gửi',
				cancelButtonLabel: 'Hủy',
				successMessageText: 'Cảm ơn bạn đã góp ý!',
				isRequiredLabel: '(bắt buộc)',
				errorEmptyMessageText: 'Vui lòng viết nội dung trước khi gửi.',
				errorTimeoutText: 'Quá thời gian gửi. Vui lòng thử lại.',
				errorGenericText: 'Không gửi được góp ý của bạn. Vui lòng thử lại.',
			},
		},
		guestView: {
			presentation: {
				watch: 'Xem hướng dẫn dành cho khách',
				close: 'Đóng hướng dẫn dành cho khách',
				title: 'Hướng dẫn chợ dành cho khách',
				heading: 'Lần ghé thăm The Bay Compassion của bạn',
				summary: 'Hướng dẫn ngắn dành cho khách vào ngày chợ.',
				description:
					'Tìm hiểu cách đăng ký, xem kết quả bốc thăm, theo dõi số của bạn và đến bàn tiếp đón.',
				play: 'Phát',
				pause: 'Tạm dừng',
				restart: 'Bắt đầu lại',
				fullscreen: 'Toàn màn hình',
				exitFullscreen: 'Thoát toàn màn hình',
				soundOn: 'Bật âm thanh',
				soundOff: 'Tắt âm thanh',
				noSound: 'Không có âm thanh',
				musicOn: 'Bật nhạc',
				musicOff: 'Tắt nhạc',
				volume: 'Âm lượng',
				seek: 'Chuyển đến thời điểm',
				open: 'Mở bài hướng dẫn',
				download: 'Tải bài hướng dẫn',
				more: 'Các bài hướng dẫn khác',
				chapter: 'Chương',
				previousChapter: 'Chương trước',
				nextChapter: 'Chương tiếp theo',
				stepByStep: 'Từng bước',
				stepByStepHint: 'Tạm dừng ở cuối mỗi chương',
				chapters: {
					welcome: 'Chào mừng',
					openPage: 'Mở trang chợ',
					signUpTime: 'Khi nào đăng ký',
					form: 'Điền đơn',
					entered: 'Bạn đã tham gia xổ số',
					draw: 'Rút thăm xổ số',
					followLine: 'Theo dõi hàng chờ',
					yourTurn: 'Đã đến lượt bạn',
					runningLate: 'Nếu bạn đến trễ',
					complete: 'Hoàn tất lượt đến',
					missedSignUp: 'Nếu bạn lỡ thời gian đăng ký',
					help: 'Nhờ giúp đỡ',
				},
			},
			languageHint: 'Bạn có thể đổi ngôn ngữ bất cứ lúc nào ở phía trên màn hình.',
			helpPrompt: 'Chưa biết phải làm gì?',
			tour: {
				progress: '{current} / {total}',
				start: 'Xem ngay',
				next: 'Tiếp',
				back: 'Quay lại',
				skip: 'Bỏ qua hướng dẫn',
				done: 'Xong',
				close: 'Đóng hướng dẫn',
				steps: {
					welcome: {
						title: 'Chào mừng! Cách thức hoạt động',
						body: 'Không cần vội. Đăng ký mở trong 15 phút, và đăng ký sớm không thay đổi cơ hội của bạn. Bạn có thể bỏ qua hướng dẫn này và xem lại bất cứ lúc nào từ trình đơn.',
					},
					language: {
						title: 'Ngôn ngữ của bạn',
						body: 'Bấm vào đây để đổi ngôn ngữ bất cứ lúc nào. Ứng dụng sẽ nhớ cho lần sau.',
					},
					countdown: {
						time: '10:30 sáng',
						title: 'Mở đăng ký',
						body: 'Mỗi thứ Bảy lúc 10:30 sáng, đăng ký mở trong 15 phút. Bạn có thể đăng ký từ bất cứ đâu, kể cả ở nhà. Trong lúc mở, đồng hồ trên màn hình này cho biết còn bao nhiêu thời gian.',
					},
					form: {
						title: 'Điền vào mẫu đơn',
						body: 'Nhập đầy đủ họ và tên (xin đừng chỉ ghi chữ viết tắt), số điện thoại di động và trả lời vài câu hỏi về hộ gia đình. Sau đó bấm “{submit}”.',
					},
					textUpdates: {
						title: 'Nhận tin nhắn cập nhật',
						body: 'Sau khi đăng ký, bấm “{action}” trên màn hình này. Không bắt buộc, nhưng nếu không bấm, bạn sẽ không nhận được tin nhắn nào.',
					},
					lottery: {
						time: '10:45 sáng',
						title: 'Xổ số',
						body: 'Ai cũng có cơ hội như nhau. Màn hình này cho biết bạn có số hay không. Không phải ai cũng có số mỗi tuần.',
					},
					line: {
						title: 'Vị trí của bạn trong hàng',
						body: 'Nếu có số, hãy đến chợ. Màn hình này cho biết vị trí của bạn trong hàng như thế này, và tự cập nhật.',
					},
					turn: {
						time: '11:30 sáng',
						title: 'Bắt đầu mua sắm',
						body: 'Khi đến lượt bạn, màn hình này sẽ báo, và chúng tôi sẽ nhắn tin nếu bạn đã đăng ký nhận tin nhắn. Hãy đến bàn tiếp nhận và mang theo điện thoại bạn đã dùng để đăng ký — chúng tôi không nhận ảnh chụp màn hình.',
					},
					help: {
						title: 'Cần nhắc lại?',
						body: '“{help}” có đầy đủ các bước.',
					},
					replay: {
						title: 'Xem lại',
						body: 'Bạn có thể xem lại hướng dẫn này bất cứ lúc nào từ trình đơn này.',
					},
				},
			},
			forms: {
				informationLegend: 'Thông tin của bạn',
				pronunciationOffer: 'Thêm cách đọc tên của bạn',
				pronunciationLabel: 'Đọc là',
				pronunciationHelp: 'Hãy viết theo cách phát âm, để chúng tôi gọi đúng tên của bạn.',
				pronunciationCollapse: 'Ẩn cách đọc tên của bạn',
				lotteryLegend: 'Thông tin tham gia xổ số',
				questionsLegend: 'Câu hỏi',
				seniorsHint: 'Bao gồm cả bạn nếu bạn từ 55 tuổi trở lên',
				exceedsHousehold:
					'Tổng số trẻ em và người cao tuổi không thể nhiều hơn số người trong hộ gia đình của bạn.',
				noAdult: 'Hộ gia đình của bạn phải có ít nhất một người lớn.',
				savedHousehold: {
					eyebrow: 'Từ lần đến trước của bạn',
					heading: 'Thông tin này còn đúng không?',
					confirm: 'Có, vẫn đúng',
					change: 'Thay đổi',
					confirmed: 'Đã xác nhận hộ gia đình',
					prompt: 'Hãy kiểm tra thông tin hộ gia đình, rồi nhấn “Có, vẫn đúng” hoặc “Thay đổi”.',
					changeHeading: 'Cập nhật hộ gia đình',
					update: 'Cập nhật',
					cancel: 'Hủy',
					close: 'Đóng',
				},
				joinSteps: {
					label: 'Trước khi tham gia',
					confirmHousehold: 'Xác nhận hộ gia đình',
					householdConfirmed: 'Đã xác nhận hộ gia đình',
					answerQuestions: 'Trả lời câu hỏi tuần này',
					questionsAnswered: 'Đã trả lời câu hỏi',
				},
				countErrors: {
					required: 'Hãy nhập một số.',
					notWholeNumber: 'Hãy nhập số nguyên, ví dụ 2.',
					outOfRange: 'Hãy nhập một số từ {min} đến {max}.',
				},
			},
			identityIndicator: {
				cancelForgetInformation: 'Hủy',
				closeForgetDialog: 'Đóng xác nhận quên thông tin',
				closeNotificationsDialog: 'Đóng cập nhật qua SMS',
				forgetDialogDescription:
					'Thao tác này sẽ xóa tên, số điện thoại, mã thiết bị và thông tin hộ gia đình đã lưu khỏi thiết bị này. Không thể hoàn tác.',
				forgetDialogTitle: 'Quên thông tin của bạn?',
				forgetInformation: 'Quên thông tin',
				heading: 'Đã nhận dạng trên thiết bị này',
				notificationsAction: 'Gửi cập nhật cho tôi qua SMS',
				notificationsDialogTitle: 'Cập nhật qua SMS',
				notificationsEnabled: 'Đã bật thông báo',
				notificationsError: 'Không thể tải trạng thái thông báo của bạn. Vui lòng thử lại sau.',
				notificationsLoading: 'Đang kiểm tra trạng thái thông báo…',
				openIdentityMenu: 'Mở menu nhận dạng',
				optOut: 'Hủy đăng ký',
				optOutError: 'Không thể hủy cập nhật qua SMS. Vui lòng thử lại.',
				saveInformationAction: 'Lưu thông tin của tôi',
				unidentifiedHeading: 'Lưu thông tin cho lần sau',
				unidentifiedMessage:
					'Lưu tên và số điện thoại để bạn không phải nhập lại trong lần ghé tiếp theo. Việc này không đưa bạn vào danh sách xổ số.',
			},
			notificationOptIn: {
				consentLabel:
					'Tôi đồng ý nhận tin nhắn từ The Bay Compassion về vị trí trong hàng đợi và trạng thái lượt ghé của tôi. Tần suất thay đổi, thường không quá vài tin nhắn trong mỗi ngày diễn ra chợ. Có thể áp dụng phí tin nhắn và dữ liệu. Trả lời STOP để hủy đăng ký hoặc HELP để được hỗ trợ. Không bắt buộc đồng ý để nhận dịch vụ tại chợ thực phẩm.',
				enable: 'Bật cập nhật qua tin nhắn',
				enabled: 'Thông báo qua tin nhắn văn bản đã được bật cho lượt ghé này và các lượt ghé sau.',
				error: 'Chúng tôi không thể bật thông báo qua tin nhắn văn bản. Vui lòng thử lại.',
				optedOut:
					'Trước đây bạn đã dừng tin nhắn văn bản. Để nhận lại thông tin cập nhật, hãy gửi START đến số của chúng tôi.',
				sendStart: 'Mở tin nhắn có sẵn START',
				checkStart: 'Tôi đã gửi START — kiểm tra lại',
			},
			scheduleInformation: {
				heading: 'Đăng ký mở vào mỗi thứ Bảy lúc 10:30 sáng',
				body: outdent`
					Việc đăng ký chưa mở. Vui lòng quay lại vào thứ Bảy lúc 10:30 sáng.
					Mọi người đều có cơ hội công bằng để tham gia bốc thăm vào hàng đợi.
				`,
			},
			notOpenState: {
				heading: 'Chợ hiện đang đóng cửa',
				subheading:
					'Đăng ký sẽ mở lại vào 10:30 sáng thứ Bảy tới và kéo dài 15 phút, đến 10:45 sáng.',
				lotteryDescription:
					'Do nguồn cung có hạn, chợ sử dụng hệ thống xổ số để chọn ngẫu nhiên người mua sắm mỗi tuần. Bạn có thể đăng ký tham gia xổ số từ bất cứ đâu, vào bất kỳ lúc nào trong 15 phút từ 10:30 đến 10:45 sáng thứ Bảy. Đăng ký sớm không làm tăng cơ hội được chọn, vì vậy bạn không cần vội.',
				selectionDescription:
					'Xổ số sẽ diễn ra lúc 10:45 sáng, để bạn có thời gian đến chợ nếu được chọn. Nếu được chọn để mua sắm, bạn sẽ nhận được một số thứ tự ngay trong ứng dụng, và giờ mua sắm bắt đầu lúc 11:30 sáng. Nếu đồng ý nhận tin nhắn văn bản, bạn cũng sẽ được thông báo qua tin nhắn.',
			},
			registrationClosedState: {
				heading: 'Đăng ký đã đóng',
				description:
					'Chúng tôi rất tiếc — bạn đã lỡ khung giờ đăng ký hôm nay. Đăng ký sẽ mở lại vào thứ Bảy tuần sau lúc 10:30 sáng, và mọi người đăng ký đều có cơ hội như nhau trong đợt xổ số.',
			},
			serviceState: {
				inProgressHeading: 'Phiên chợ hôm nay đang diễn ra',
				inProgressDescription:
					'Đăng ký đã đóng cho hôm nay. Đăng ký sẽ mở lại vào 10:30 sáng thứ Bảy tới và kéo dài 15 phút, đến 10:45 sáng. Ai đăng ký cũng có cơ hội như nhau.',
			},
			refreshNotice: {
				countdown: 'Cập nhật sau {seconds} giây',
				updating: 'Đang cập nhật…',
				noNeedToRefresh: 'Không cần tải lại — trang này tự cập nhật.',
				accessibleDescription: 'Trang này tự động cập nhật. Bạn không cần tải lại trang.',
			},
			visitStatus: {
				yourNumberLabel: 'Số của bạn',
				labels: {
					registered: 'Đã đăng ký',
					waiting: 'Đang chờ',
					called: 'Đã gọi',
					served: 'Đã phục vụ',
					not_placed: 'Không được chọn',
					no_show: 'Không đến',
					cancelled: 'Đã hủy',
				},
				registered: {
					header: 'Bạn đã tham gia xổ số!',
					details:
						'Khi đăng ký kết thúc, chúng tôi sẽ bốc thăm và kết quả của bạn sẽ hiện ở đây. Nếu bạn đã đăng ký nhận tin nhắn, chúng tôi cũng sẽ nhắn tin cho bạn.',
				},
				waiting: {
					header: 'Bạn đã có số!',
					details: 'Hãy đến chợ ngay nếu bạn chưa có mặt. Chúng tôi sẽ báo ở đây khi đến lượt bạn.',
					guestsAheadLabel: 'Số khách trước bạn',
					youAreNext: 'Bạn là người tiếp theo',
					nowCallingLabel: 'Đang gọi số',
					nowCallingNone: 'Bắt đầu gọi số lúc 11:30 sáng',
				},
				called: {
					header: 'Hãy đến bàn tiếp nhận ngay',
					headerLate: 'Vui lòng nhanh đến bàn tiếp nhận',
					details: 'Đã đến lượt bạn. Hãy mang theo điện thoại này đến bàn tiếp nhận.',
					detailsLate:
						'Số của bạn đã được gọi. Những người khác đang chờ sau bạn, vì vậy vui lòng đến bàn tiếp nhận ngay bây giờ.',
					calledMinutesAgoOne: 'Đã gọi bạn 1 phút trước',
					calledMinutesAgoOther: 'Đã gọi bạn {minutes} phút trước',
				},
				served: {
					header: 'Cảm ơn bạn đã đến',
					details:
						'Lượt mua sắm hôm nay của bạn đã hoàn tất. Đăng ký sẽ mở lại vào thứ Bảy tuần sau lúc 10:30 sáng.',
				},
				not_placed: {
					header: 'Rất tiếc, lần này chưa được',
					details:
						'Bạn không được chọn trong đợt xổ số hôm nay. Việc chọn hoàn toàn ngẫu nhiên và nguồn cung có hạn. Mong gặp lại bạn vào thứ Bảy tuần sau. Đăng ký mở lúc 10:30 sáng.',
				},
				no_show: {
					header: 'Số của bạn đã được gọi',
					details:
						'Chúng tôi không thấy bạn ở bàn tiếp nhận. Nếu bạn vẫn còn ở chợ, vui lòng đến đó ngay và nhờ nhân viên giúp đỡ.',
				},
				cancelled: {
					header: 'Lượt của bạn đã bị hủy',
					details:
						'Hôm nay bạn sẽ không được gọi. Nếu có nhầm lẫn, vui lòng gặp nhân viên. Đăng ký sẽ mở lại vào thứ Bảy tuần sau lúc 10:30 sáng.',
				},
				cancelAction: 'Hủy lượt ghé này',
				cancelConfirmation: 'Hủy vị trí của bạn trong hàng đợi cho lượt ghé này?',
				cancelConfirm: 'Có, hủy lượt ghé của tôi',
				cancelDismiss: 'Giữ vị trí của tôi',
				updateError: 'Không thể cập nhật lượt ghé này. Vui lòng nhờ nhân viên chợ hỗ trợ.',
			},
		},
		admin: 'Quản trị',
		adminDescription: 'Công cụ quản lý hàng đợi sẽ sớm có.',
		adminTitle: 'Một cách đơn giản hơn để chào đón mọi người hàng xóm.',
		age: 'Tuổi',
		agePlaceholder: 'Chọn độ tuổi của bạn',
		ageRange0to17: '0–17',
		ageRange18to29: '18–29',
		ageRange30to44: '30–44',
		ageRange45to59: '45–59',
		ageRange60to74: '60–74',
		ageRange75plus: '75+',
		authConfigurationDescription:
			'Thêm các biến môi trường Auth0 bằng tiện ích Auth0 của Netlify, sau đó triển khai lại trang web.',
		authConfigurationRequired: 'Chưa cấu hình đăng nhập quản trị',
		authError: 'Không thể xác minh phiên quản trị của bạn. Vui lòng đăng nhập lại.',
		authLoading: 'Đang xác minh phiên quản trị…',
		backToGuest: 'Quay lại đăng ký khách',
		childrenCount: 'Số trẻ em bạn đang mua sắm cho',
		countDecrementLabel: 'Giảm số lượng',
		countIncrementLabel: 'Tăng số lượng',
		chooseAnswer: 'Chọn câu trả lời',
		signupView: {
			formDescription:
				'Lưu tên và số điện thoại để bạn không phải nhập lại trong lần ghé tiếp theo. Việc này không đưa bạn vào danh sách xổ số hoặc giữ chỗ trong hàng đợi.',
			formTitle: 'Lưu thông tin cho lần sau',
			submit: 'Lưu thông tin của tôi',
			submitting: 'Đang lưu…',
			successDescription:
				'Bạn sẽ không phải nhập lại trong lần ghé tiếp theo. Bạn chưa tham gia xổ số hoặc giữ chỗ trong hàng đợi.',
			successTitle: 'Thông tin của bạn đã được lưu',
		},
		claimView: {
			title: 'Thiết lập điện thoại này',
			description:
				'Một nhân viên đã thêm bạn. Hãy thiết lập điện thoại này để xem trạng thái và nhận thông báo cập nhật tại đây.',
			replaceHeading: 'Thông tin đã lưu sẽ bị thay thế',
			replaceWarning:
				'Điện thoại này đã có thông tin đã lưu hoặc một lượt ghé thăm. Thiết lập cho bạn sẽ thay thế thông tin đó và không thể khôi phục.',
			submit: 'Thiết lập điện thoại này',
			submitting: 'Đang thiết lập…',
			failed: 'Mã này đã hết hạn hoặc đã được sử dụng. Hãy xin nhân viên một mã mới.',
			missingCode: 'Liên kết này thiếu mã. Hãy nhờ nhân viên cho bạn xem lại mã QR.',
		},
		kiosk: {
			nowCalling: 'Đang gọi số',
			nowCallingNone: 'Chưa gọi số nào',
			stillWaitingFor: 'Đã gọi',
			waitingCount: 'Đang xếp hàng: {count}',
			moreCount: '+{count} số khác',
			notStarted: 'Các số sẽ được gọi tại đây khi chợ mở cửa',
			ended: 'Chợ hôm nay đã kết thúc. Cảm ơn quý vị đã đến!',
			loading: 'Đang tải hàng chờ…',
			reconnecting: 'Đang kết nối lại…',
			fullscreen: 'Toàn màn hình',
		},
		help: {
			title: 'Cách thức hoạt động',
			introHeading: 'Giờ là xổ số, không phải chạy đua.',
			introBody: 'Đăng ký từ bất cứ đâu. Ai cũng có cơ hội như nhau.',
			stepsHeading: 'Mỗi thứ Bảy',
			steps: [
				{
					time: '10:30 sáng',
					title: 'Quét mã',
					body: 'Ở đâu cũng được, kể cả ở nhà. Bạn có 15 phút, và màn hình cho biết còn bao nhiêu thời gian.',
				},
				{ title: 'Chọn ngôn ngữ của bạn', body: 'Ứng dụng sẽ nhớ cho lần sau.' },
				{
					title: 'Điền vào mẫu đơn',
					body: 'Nhập đầy đủ họ và tên (xin đừng chỉ ghi chữ viết tắt), số điện thoại di động và trả lời vài câu hỏi về hộ gia đình. Không cần vội, cứ từ từ. Sau đó bấm nút để tham gia xổ số.',
				},
				{
					title: 'Bấm “Gửi cập nhật cho tôi qua SMS”',
					body: 'Không bắt buộc, nhưng nếu không bấm, bạn sẽ không nhận được tin nhắn nào.',
				},
				{
					time: '10:45 sáng',
					title: 'Xem bạn có số không',
					body: 'Màn hình cho biết kết quả xổ số và vị trí của bạn trong hàng. Nếu có số, hãy đến chợ. Không phải ai cũng có số mỗi tuần.',
				},
				{
					time: '11:30 sáng',
					title: 'Bắt đầu mua sắm',
					body: 'Khi đến lượt bạn, chúng tôi sẽ nhắn tin (nếu bạn đã làm bước 4) và màn hình cũng sẽ báo. Hãy đến bàn tiếp nhận.',
				},
			],
			phoneNotice: {
				heading: 'Vui lòng mang theo điện thoại bạn đã dùng để đăng ký.',
				body: 'Chúng tôi không nhận ảnh chụp màn hình.',
			},
		},
		firstName: 'Tên',
		formDescription: 'Một vài thông tin giúp chúng tôi chuẩn bị cho chuyến thăm của bạn.',
		formTitle: 'Hãy cho chúng tôi biết về bạn',
		guest: 'Khách',
		household: 'Số người trong hộ gia đình của bạn',
		householdHint: 'Bao gồm cả bạn',
		lastName: 'Họ',
		language: 'Ngôn ngữ',
		languagePrompt: 'Chọn ngôn ngữ của bạn',
		marketName: 'The Bay Compassion',
		notifications: {
			registered: {
				title: 'Đã xác nhận đăng ký',
				body: 'Đăng ký của bạn đã được xác nhận.',
			},
			registrationClosed: {
				title: 'Đã đóng đăng ký',
				body: 'Đăng ký đã đóng. Xổ số sẽ sớm bắt đầu.',
			},
			selected: {
				title: 'Bạn đã được chọn',
				body: 'Bạn đã được chọn. Vui lòng chờ đến khi được gọi.',
			},
			notSelected: {
				title: 'Kết quả xổ số',
				body: 'Bạn không được chọn cho buổi phục vụ hôm nay.',
			},
			called: {
				title: 'Đến lượt bạn',
				body: 'Vui lòng đến bàn tiếp nhận ngay bây giờ.',
			},
			sms: {
				welcome: 'Chào mừng bạn! Bạn sẽ nhận được cập nhật qua tin nhắn.',
				selected: 'Bạn đã được chọn! Số của bạn là {number}. Vui lòng chờ đến khi được gọi.',
				notSelected: 'Bạn không được chọn cho buổi phục vụ hôm nay.',
				called: 'Đến lượt bạn. Vui lòng đến bàn tiếp nhận ngay bây giờ.',
			},
			pushOptIn: {
				enable: 'Thông báo cho tôi về lượt ghé này',
				denied: 'Thông báo đang bị chặn. Hãy bật trong phần cài đặt thiết bị.',
				enabled: 'Đã bật thông báo cho lượt ghé này.',
				error: 'Chúng tôi không thể bật thông báo. Vui lòng thử lại.',
				iosInstall:
					'Trên iPhone hoặc iPad, hãy thêm ứng dụng này vào Màn hình chính trước khi bật thông báo.',
				unsupported: 'Thiết bị này không hỗ trợ thông báo đẩy.',
			},
		},
		seniorsCount: 'Số người cao tuổi (55+) bạn đang mua sắm cho',
		phone: 'Số điện thoại',
		privacy: 'Thông tin của bạn chỉ được dùng để giúp chúng tôi phục vụ bạn.',
		privacyPolicy: 'Chính sách quyền riêng tư',
		qrCodeDescription:
			'Quét mã này bằng camera điện thoại, hoặc truy cập liên kết bên dưới, để mở trang đăng ký.',
		qrCodeImageAlt: 'Mã QR liên kết đến trang đăng ký',
		qrCodePrint: 'In',
		qrCodeTitle: 'Quét để đăng ký',
		registrationClosesIn: 'Đăng ký sẽ đóng sau',
		registrationClosesInMinutes: 'Đăng ký sẽ đóng sau {minutes} phút',
		submissionError: 'Chúng tôi không thể lưu đăng ký của bạn. Vui lòng thử lại.',
		submit: 'Tham gia xổ số',
		submitting: 'Đang tham gia xổ số…',
		termsAndConditions: 'Điều khoản và Điều kiện',
		statusLoading: 'Đang kiểm tra tình trạng chợ hôm nay…',
		welcome: 'Chào mừng đến với chợ thực phẩm cộng đồng',
	},
	zh: {
		appError: {
			heading: '出了点问题',
			description: '应用遇到问题，无法显示此页面。重新加载通常可以解决。',
			reload: '重新加载',
		},
		holdingPage: {
			heading: '新应用将于10月31日上线',
			instructions: '请保留此二维码，并于10月31日再次扫描。',
			currentAppHeading: '想参加今天的食品市场？',
			currentAppDescription: '在10月31日之前，请使用现有应用。此二维码用于新应用。',
			currentAppLink: '打开现有应用',
		},
		appBar: {
			openMenu: '打开菜单',
			accountMenu: '账户菜单',
			website: 'The Bay Compassion 网站',
			qrCode: '二维码',
			staffLogin: '工作人员登录',
			adminPanel: '管理面板',
			signOut: '退出登录',
			sendFeedback: '发送反馈',
			deviceDetails: {
				title: '设备详情',
				close: '关闭设备详情',
				installIdLabel: '设备 ID',
				deviceTokenLabel: '访客令牌',
				deviceTokenHint: '请只提供给工作人员。',
				copy: '复制',
				copied: '已复制',
				copyInstallId: '复制设备 ID',
				copyDeviceToken: '复制访客令牌',
				copyError: '无法复制。请重试。',
			},
			takeTour: '查看使用导览',
			colorMode: {
				title: '外观',
				close: '关闭外观设置',
				system: '跟随设备',
				light: '浅色',
				dark: '深色',
			},
			feedbackForm: {
				formTitle: '发送反馈',
				nameLabel: '姓名（选填）',
				namePlaceholder: '您的姓名',
				messageLabel: '您的反馈',
				messagePlaceholder: '请告诉我们遇到了什么问题，或有哪些地方可以改进。请勿填写个人信息。',
				submitButtonLabel: '发送',
				cancelButtonLabel: '取消',
				successMessageText: '感谢您的反馈！',
				isRequiredLabel: '（必填）',
				errorEmptyMessageText: '请先填写内容再发送。',
				errorTimeoutText: '发送超时，请重试。',
				errorGenericText: '反馈发送失败，请重试。',
			},
		},
		guestView: {
			presentation: {
				watch: '观看访客指南',
				close: '关闭访客指南',
				title: '访客食品市场指南',
				heading: '您在 The Bay Compassion 的到访',
				summary: '市场开放日的访客简明指南。',
				description: '了解如何报名、查看抽签结果、关注您的号码以及前往签到处。',
				play: '播放',
				pause: '暂停',
				restart: '重新开始',
				fullscreen: '全屏',
				exitFullscreen: '退出全屏',
				soundOn: '声音已开启',
				soundOff: '声音已关闭',
				noSound: '无音频',
				musicOn: '音乐已开启',
				musicOff: '音乐已关闭',
				volume: '音量',
				seek: '跳转进度',
				open: '打开演示',
				download: '下载演示',
				more: '更多演示',
				chapter: '章节',
				previousChapter: '上一章',
				nextChapter: '下一章',
				stepByStep: '分步播放',
				stepByStepHint: '每章结束时暂停',
				chapters: {
					welcome: '欢迎',
					openPage: '打开市集页面',
					signUpTime: '何时登记',
					form: '填写表格',
					entered: '您已参加抽签',
					draw: '抽签',
					followLine: '关注排队进度',
					yourTurn: '轮到您了',
					runningLate: '如果您晚到',
					complete: '到访完成',
					missedSignUp: '如果错过了登记',
					help: '获取帮助',
				},
			},
			languageHint: '您可以随时在屏幕顶部更改语言。',
			helpPrompt: '不知道该怎么做？',
			tour: {
				progress: '第 {current} 步，共 {total} 步',
				start: '开始',
				next: '下一步',
				back: '上一步',
				skip: '跳过导览',
				done: '完成',
				close: '关闭导览',
				steps: {
					welcome: {
						title: '欢迎！使用方法如下',
						body: '不用着急。登记开放 15 分钟，早登记不会提高您的机会。您可以跳过本导览，之后随时从菜单再次查看。',
					},
					language: {
						title: '您的语言',
						body: '随时点击这里更改语言。应用会记住，下次无需再选。',
					},
					countdown: {
						time: '上午 10:30',
						title: '登记开始',
						body: '每周六上午 10:30 开放登记，持续 15 分钟。您在任何地方都能登记，在家也行。登记开放期间，屏幕上的计时器会显示剩余时间。',
					},
					form: {
						title: '填写表格',
						body: '请填写您的完整姓名（不要只写首字母）、手机号码，并回答几个关于您家庭的问题。然后点击“{submit}”。',
					},
					textUpdates: {
						title: '接收短信通知',
						body: '登记后，请在此屏幕上点击“{action}”。这是可选的，但如果不点击，您将不会收到任何短信。',
					},
					lottery: {
						time: '上午 10:45',
						title: '抽签开始',
						body: '每个人机会均等。此屏幕会显示您是否抽中号码。并非每个人每周都能抽中。',
					},
					line: {
						title: '您的排队位置',
						body: '如果抽中号码，请前往市场。此屏幕会像这样显示您的排队位置，并会自动更新。',
					},
					turn: {
						time: '上午 11:30',
						title: '开始购物',
						body: '轮到您时，此屏幕会显示，如果您登记了短信通知，我们也会发短信给您。请到签到台来，并携带您登记时使用的手机——不接受截图。',
					},
					help: {
						title: '需要回顾？',
						body: '“{help}”里有每一个步骤。',
					},
					replay: {
						title: '再看一次',
						body: '您随时可以从这个菜单再次查看本导览。',
					},
				},
			},
			forms: {
				informationLegend: '您的信息',
				pronunciationOffer: '添加您名字的读音',
				pronunciationLabel: '读作',
				pronunciationHelp: '请按读音写出，方便我们正确叫出您的名字。',
				pronunciationCollapse: '隐藏名字读音',
				lotteryLegend: '抽签登记信息',
				questionsLegend: '问题',
				seniorsHint: '如果您年满55岁，请包括您自己',
				exceedsHousehold: '儿童和老年人的总数不能超过您家庭中的人数。',
				noAdult: '您的家庭中必须至少有一名成年人。',
				savedHousehold: {
					eyebrow: '来自您上次到访',
					heading: '这些信息还正确吗？',
					confirm: '是的，仍然正确',
					change: '修改',
					confirmed: '家庭信息已确认',
					prompt: '请核对您的家庭信息，然后点击“是的，仍然正确”或“修改”。',
					changeHeading: '更新家庭信息',
					update: '更新',
					cancel: '取消',
					close: '关闭',
				},
				joinSteps: {
					label: '参加前',
					confirmHousehold: '确认家庭信息',
					householdConfirmed: '家庭信息已确认',
					answerQuestions: '回答本周的问题',
					questionsAnswered: '问题已回答',
				},
				countErrors: {
					required: '请输入一个数字。',
					notWholeNumber: '请输入整数，例如 2。',
					outOfRange: '请输入 {min} 到 {max} 之间的数字。',
				},
			},
			identityIndicator: {
				cancelForgetInformation: '取消',
				closeForgetDialog: '关闭忘记信息确认对话框',
				closeNotificationsDialog: '关闭短信更新',
				forgetDialogDescription:
					'这会从此设备中删除已保存的姓名、电话号码、设备 ID 和家庭信息，且无法撤销。',
				forgetDialogTitle: '忘记您的信息？',
				forgetInformation: '忘记信息',
				heading: '已在此设备上识别',
				notificationsAction: '通过短信通知我最新消息',
				notificationsDialogTitle: '短信更新',
				notificationsEnabled: '通知已启用',
				notificationsError: '无法获取您的通知状态。请稍后重试。',
				notificationsLoading: '正在检查通知状态…',
				openIdentityMenu: '打开身份菜单',
				optOut: '取消订阅',
				optOutError: '无法取消短信更新。请重试。',
				saveInformationAction: '保存我的信息',
				unidentifiedHeading: '保存信息，方便下次使用',
				unidentifiedMessage:
					'保存您的姓名和电话号码，下次到访时就无需再次输入。这不会让您进入抽签。',
			},
			notificationOptIn: {
				consentLabel:
					'我同意接收 The Bay Compassion 发送的有关排队位置和到访状态的短信。短信频率不定，通常每个市场开放日不超过数条。可能会产生短信和数据费用。回复 STOP 可取消订阅，回复 HELP 可获取帮助。是否同意接收短信不影响获得食品市场服务。',
				enable: '启用短信更新',
				enabled: '已为本次及今后的到访启用短信更新。',
				error: '我们无法启用短信更新。请重试。',
				optedOut: '您之前已停止接收短信。要重新接收更新，请向我们的号码发送 START。',
				sendStart: '打开预填 START 的短信',
				checkStart: '我已发送 START — 再次检查',
			},
			scheduleInformation: {
				heading: '登记每周六上午 10:30 开放',
				body: outdent`
					登记尚未开放。请于周六上午 10:30 再次访问。
					每个人都将有公平的机会参加排队抽签。
				`,
			},
			notOpenState: {
				heading: '市场已关闭',
				subheading: '登记将于下周六上午 10:30 再次开放，持续 15 分钟，至上午 10:45。',
				lotteryDescription:
					'由于物资有限，市场每周通过抽签随机选出购物者。您可以在周六上午 10:30 至 10:45 的 15 分钟内，随时随地登记参加抽签。提前登记不会增加被选中的机会，因此无需着急。',
				selectionDescription:
					'抽签将于上午 10:45 进行，如果您获选，还有时间前往市场。如果您获选购物，应用中会显示您的号码，购物从上午 11:30 开始。如果您同意接收短信，也会收到短信通知。',
			},
			registrationClosedState: {
				heading: '登记已结束',
				description:
					'很抱歉，您错过了今天的登记时段。登记将于下周六上午 10:30 重新开放，所有登记的人在抽签中机会均等。',
			},
			serviceState: {
				inProgressHeading: '今天的市场正在进行中',
				inProgressDescription:
					'今天的登记已关闭。登记将于下周六上午 10:30 再次开放，持续 15 分钟，至上午 10:45。每位登记的人机会均等。',
			},
			refreshNotice: {
				countdown: '{seconds} 秒后更新',
				updating: '正在更新…',
				noNeedToRefresh: '无需刷新，本页面会自动更新。',
				accessibleDescription: '本页面会自动更新，您无需刷新。',
			},
			visitStatus: {
				yourNumberLabel: '您的号码',
				labels: {
					registered: '已登记',
					waiting: '等待中',
					called: '已叫号',
					served: '已服务',
					not_placed: '未入选',
					no_show: '未到场',
					cancelled: '已取消',
				},
				registered: {
					header: '您已参加抽签！',
					details:
						'登记截止后将进行抽签，结果会显示在这里。如果您订阅了短信通知，我们也会给您发短信。',
				},
				waiting: {
					header: '您拿到号码了！',
					details: '如果您还不在现场，请现在前往市场。轮到您时，我们会在这里通知您。',
					guestsAheadLabel: '您前面的访客',
					youAreNext: '下一位就是您',
					nowCallingLabel: '正在叫号',
					nowCallingNone: '上午 11:30 开始叫号',
				},
				called: {
					header: '请现在到签到台',
					headerLate: '请尽快到签到台',
					details: '轮到您了。请带着这部手机到签到台。',
					detailsLate: '已经叫到您的号码。后面还有其他人在等候，请现在到签到台来。',
					calledMinutesAgoOne: '1 分钟前已叫到您',
					calledMinutesAgoOther: '{minutes} 分钟前已叫到您',
				},
				served: {
					header: '感谢您的到来',
					details: '您今天的到访已完成。登记将于下周六上午 10:30 重新开放。',
				},
				not_placed: {
					header: '很抱歉，这次没有抽中',
					details:
						'您在今天的抽签中没有被抽中。抽签完全随机，而且物资有限。希望下周六再见到您。登记于上午 10:30 开放。',
				},
				no_show: {
					header: '已叫到您的号码',
					details:
						'我们在签到台没有找到您。如果您还在市场，请现在前往签到台，并向工作人员寻求帮助。',
				},
				cancelled: {
					header: '您的到访已取消',
					details:
						'今天不会再叫您的号码。如果这是误操作，请联系工作人员。登记将于下周六上午 10:30 重新开放。',
				},
				cancelAction: '取消本次到访',
				cancelConfirmation: '要取消本次到访的排队位置吗？',
				cancelConfirm: '是，取消我的到访',
				cancelDismiss: '保留我的位置',
				updateError: '无法更新本次到访。请向市场工作人员寻求帮助。',
			},
		},
		admin: '管理',
		adminDescription: '排队管理工具即将推出。',
		adminTitle: '用更简单的方式欢迎每一位邻居。',
		age: '年龄',
		agePlaceholder: '选择您的年龄段',
		ageRange0to17: '0–17',
		ageRange18to29: '18–29',
		ageRange30to44: '30–44',
		ageRange45to59: '45–59',
		ageRange60to74: '60–74',
		ageRange75plus: '75+',
		authConfigurationDescription:
			'请通过 Netlify Auth0 扩展添加 Auth0 环境变量，然后重新部署网站。',
		authConfigurationRequired: '尚未配置管理员登录',
		authError: '无法验证您的管理员会话。请重新登录。',
		authLoading: '正在验证管理员会话…',
		backToGuest: '返回访客登记',
		childrenCount: '您为多少儿童采购',
		countDecrementLabel: '减少数量',
		countIncrementLabel: '增加数量',
		chooseAnswer: '请选择答案',
		signupView: {
			formDescription:
				'保存您的姓名和电话号码，下次到访时就无需再次输入。这不会让您进入抽签，也不会在队列中预留位置。',
			formTitle: '保存信息，方便下次使用',
			submit: '保存我的信息',
			submitting: '正在保存…',
			successDescription: '下次到访时无需再次输入。您尚未进入抽签，也未在队列中预留位置。',
			successTitle: '您的信息已保存',
		},
		claimView: {
			title: '设置这部手机',
			description: '工作人员已为您登记。设置这部手机后，您可以在这里查看您的状态并接收最新通知。',
			replaceHeading: '已保存的信息将被替换',
			replaceWarning: '这部手机上已有保存的信息或到访记录。为您设置后将替换这些内容，且无法恢复。',
			submit: '设置这部手机',
			submitting: '正在设置…',
			failed: '此二维码已过期或已被使用。请向工作人员索取新的二维码。',
			missingCode: '此链接缺少代码。请让工作人员再次向您出示二维码。',
		},
		kiosk: {
			nowCalling: '正在叫号',
			nowCallingNone: '尚未叫号',
			stillWaitingFor: '已叫号',
			waitingCount: '排队中：{count}',
			moreCount: '另有 {count} 个',
			notStarted: '市场开放后将在此叫号',
			ended: '今天的市场已结束。感谢您的光临！',
			loading: '正在加载队列…',
			reconnecting: '正在重新连接…',
			fullscreen: '全屏',
		},
		help: {
			title: '使用说明',
			introHeading: '现在是抽签，不是抢先。',
			introBody: '随时随地都能登记，每个人机会均等。',
			stepsHeading: '每周六',
			steps: [
				{
					time: '上午 10:30',
					title: '扫描二维码',
					body: '在任何地方都可以，在家也行。您有 15 分钟，屏幕会显示剩余时间。',
				},
				{ title: '选择您的语言', body: '应用会记住，下次无需再选。' },
				{
					title: '填写表格',
					body: '请填写您的完整姓名（不要只写首字母）、手机号码，并回答几个关于您家庭的问题。不用着急，慢慢填写。然后点击按钮参加抽签。',
				},
				{
					title: '点击“通过短信通知我最新消息”',
					body: '可选，但如果不点击，您将不会收到任何短信。',
				},
				{
					time: '上午 10:45',
					title: '查看是否抽中号码',
					body: '抽签结束后，屏幕会显示结果和您的排队位置。如果抽中号码，请前往市场。并非每个人每周都能抽中。',
				},
				{
					time: '上午 11:30',
					title: '开始购物',
					body: '轮到您时，我们会发短信通知您（如果您完成了第 4 步），屏幕也会显示。请到签到台来。',
				},
			],
			phoneNotice: { heading: '请携带您登记时使用的手机。', body: '不接受截图。' },
		},
		firstName: '名字',
		formDescription: '一些基本信息能帮助我们为您的到访做好准备。',
		formTitle: '请告诉我们您的信息',
		guest: '访客',
		household: '您家庭中的人数',
		householdHint: '包括您自己',
		lastName: '姓氏',
		language: '语言',
		languagePrompt: '选择您的语言',
		marketName: 'The Bay Compassion',
		notifications: {
			registered: {
				title: '登记已确认',
				body: '您的登记已确认。',
			},
			registrationClosed: {
				title: '登记已关闭',
				body: '登记已关闭。抽签即将开始。',
			},
			selected: {
				title: '您已被选中',
				body: '您已被选中。请等待叫号。',
			},
			notSelected: {
				title: '抽签结果',
				body: '您未被选中参加今天的服务。',
			},
			called: {
				title: '轮到您了',
				body: '请现在到签到台来。',
			},
			sms: {
				welcome: '欢迎！您现在可以通过短信接收更新了。',
				selected: '您已被选中！您的号码是 {number}。请等待叫号。',
				notSelected: '您未被选中参加今天的服务。',
				called: '轮到您了。请现在到签到台来。',
			},
			pushOptIn: {
				enable: '通知我此次到访的状态',
				denied: '通知已被阻止。请在设备设置中启用。',
				enabled: '已为此次到访启用通知。',
				error: '无法启用通知。请重试。',
				iosInstall: '在 iPhone 或 iPad 上，请先将此应用添加到主屏幕，然后再启用通知。',
				unsupported: '此设备不支持推送通知。',
			},
		},
		seniorsCount: '您为多少老年人（55岁以上）采购',
		phone: '电话号码',
		privacy: '您的信息仅用于帮助我们为您提供服务。',
		privacyPolicy: '隐私政策',
		qrCodeDescription: '用手机相机扫描此二维码，或访问下方链接，打开登记页面。',
		qrCodeImageAlt: '链接到登记页面的二维码',
		qrCodePrint: '打印',
		qrCodeTitle: '扫码登记',
		registrationClosesIn: '距登记关闭还剩',
		registrationClosesInMinutes: '登记将在 {minutes} 分钟后关闭',
		submissionError: '无法保存您的登记信息。请重试。',
		submit: '参加抽签',
		submitting: '正在参加抽签…',
		termsAndConditions: '条款和条件',
		statusLoading: '正在查询今天的市场状态…',
		welcome: '欢迎来到社区食品市场',
	},
	ar: {
		appError: {
			heading: 'حدث خطأ ما',
			description:
				'واجه التطبيق مشكلة ولم يتمكن من عرض هذه الصفحة. عادةً ما تُحل المشكلة بإعادة التحميل.',
			reload: 'إعادة التحميل',
		},
		holdingPage: {
			heading: 'إطلاق التطبيق الجديد في ٣١ أكتوبر',
			instructions: 'احتفظ برمز QR هذا وامسحه مرة أخرى في ٣١ أكتوبر.',
			currentAppHeading: 'هل تبحث عن سوق المواد الغذائية اليوم؟',
			currentAppDescription: 'استخدم التطبيق الحالي حتى ٣١ أكتوبر. رمز QR هذا مخصص للتطبيق الجديد.',
			currentAppLink: 'فتح التطبيق الحالي',
		},
		appBar: {
			openMenu: 'فتح القائمة',
			accountMenu: 'قائمة الحساب',
			website: 'موقع The Bay Compassion',
			qrCode: 'رمز QR',
			staffLogin: 'تسجيل دخول الموظفين',
			adminPanel: 'لوحة الإدارة',
			signOut: 'تسجيل الخروج',
			sendFeedback: 'إرسال ملاحظات',
			deviceDetails: {
				title: 'تفاصيل الجهاز',
				close: 'إغلاق تفاصيل الجهاز',
				installIdLabel: 'معرّف الجهاز',
				deviceTokenLabel: 'رمز الضيف',
				deviceTokenHint: 'لا تشاركه إلا مع أحد الموظفين.',
				copy: 'نسخ',
				copied: 'تم النسخ',
				copyInstallId: 'نسخ معرّف الجهاز',
				copyDeviceToken: 'نسخ رمز الضيف',
				copyError: 'تعذر النسخ. يرجى المحاولة مرة أخرى.',
			},
			takeTour: 'شاهد الجولة التعريفية',
			colorMode: {
				title: 'المظهر',
				close: 'إغلاق إعدادات المظهر',
				system: 'مطابقة إعداد الجهاز',
				light: 'فاتح',
				dark: 'داكن',
			},
			feedbackForm: {
				formTitle: 'إرسال ملاحظات',
				nameLabel: 'الاسم (اختياري)',
				namePlaceholder: 'اسمك',
				messageLabel: 'ملاحظاتك',
				messagePlaceholder:
					'أخبرنا بما حدث من خطأ أو بما يمكن تحسينه. يُرجى عدم كتابة أي معلومات شخصية.',
				submitButtonLabel: 'إرسال',
				cancelButtonLabel: 'إلغاء',
				successMessageText: 'شكرًا لك على ملاحظاتك!',
				isRequiredLabel: '(مطلوب)',
				errorEmptyMessageText: 'يُرجى كتابة رسالة قبل الإرسال.',
				errorTimeoutText: 'استغرق الإرسال وقتًا طويلًا. يُرجى المحاولة مرة أخرى.',
				errorGenericText: 'تعذّر إرسال ملاحظاتك. يُرجى المحاولة مرة أخرى.',
			},
		},
		guestView: {
			presentation: {
				watch: 'شاهد دليل الضيوف',
				close: 'إغلاق دليل الضيوف',
				title: 'دليل السوق للضيوف',
				heading: 'زيارتك إلى The Bay Compassion',
				summary: 'دليل قصير للضيوف في يوم السوق.',
				description:
					'تعرّف على كيفية التسجيل ومعرفة نتيجة القرعة ومتابعة رقمك والتوجه إلى مكتب تسجيل الوصول.',
				play: 'تشغيل',
				pause: 'إيقاف مؤقت',
				restart: 'البدء من جديد',
				fullscreen: 'ملء الشاشة',
				exitFullscreen: 'الخروج من ملء الشاشة',
				soundOn: 'الصوت مفعّل',
				soundOff: 'الصوت مغلق',
				noSound: 'لا يوجد صوت',
				musicOn: 'الموسيقى مفعّلة',
				musicOff: 'الموسيقى مغلقة',
				volume: 'مستوى الصوت',
				seek: 'الانتقال إلى وقت',
				open: 'فتح العرض',
				download: 'تنزيل العرض',
				more: 'المزيد من العروض',
				chapter: 'الفصل',
				previousChapter: 'الفصل السابق',
				nextChapter: 'الفصل التالي',
				stepByStep: 'خطوة بخطوة',
				stepByStepHint: 'التوقف عند نهاية كل فصل',
				chapters: {
					welcome: 'مرحبًا بك',
					openPage: 'افتح صفحة السوق',
					signUpTime: 'متى تسجّل',
					form: 'املأ النموذج',
					entered: 'أنت مشارك في السحب',
					draw: 'إجراء القرعة',
					followLine: 'تابع الطابور',
					yourTurn: 'حان دورك',
					runningLate: 'إذا تأخرت',
					complete: 'اكتملت زيارتك',
					missedSignUp: 'إذا فاتك التسجيل',
					help: 'طلب المساعدة',
				},
			},
			languageHint: 'يمكنك تغيير اللغة في أي وقت من أعلى الشاشة.',
			helpPrompt: 'لست متأكدًا مما عليك فعله؟',
			tour: {
				progress: '{current} من {total}',
				start: 'أرني',
				next: 'التالي',
				back: 'السابق',
				skip: 'تخطَّ الجولة',
				done: 'تم',
				close: 'أغلق الجولة',
				steps: {
					welcome: {
						title: 'مرحبًا! هكذا يعمل',
						body: 'لا داعي للعجلة. يبقى التسجيل مفتوحًا 15 دقيقة، والتسجيل المبكر لا يغيّر فرصتك. يمكنك تخطي هذه الجولة والعودة إليها في أي وقت من القائمة.',
					},
					language: {
						title: 'لغتك',
						body: 'اضغط هنا لتغيير لغتك في أي وقت. سيتذكرها التطبيق في المرة القادمة.',
					},
					countdown: {
						time: '10:30 صباحًا',
						title: 'يبدأ التسجيل',
						body: 'كل يوم سبت الساعة 10:30 صباحًا، يُفتح التسجيل لمدة 15 دقيقة. يمكنك التسجيل من أي مكان، حتى من المنزل. أثناء فتحه، يعرض مؤقت على هذه الشاشة الوقت المتبقي.',
					},
					form: {
						title: 'املأ النموذج',
						body: 'أدخل اسمك الأول واسم العائلة (من فضلك، لا الأحرف الأولى فقط)، ورقم هاتفك المحمول، وأجب عن بعض الأسئلة حول أسرتك. ثم اضغط «{submit}».',
					},
					textUpdates: {
						title: 'تلقَّ الرسائل النصية',
						body: 'بعد التسجيل، اضغط «{action}» على هذه الشاشة. هذا اختياري، لكن بدونه لن تصلك أي رسائل نصية.',
					},
					lottery: {
						time: '10:45 صباحًا',
						title: 'تُجرى القرعة',
						body: 'للجميع الفرصة نفسها. تعرض هذه الشاشة إن حصلت على رقم. لا يحصل الجميع على رقم كل أسبوع.',
					},
					line: {
						title: 'مكانك في الطابور',
						body: 'إن حصلت على رقم، توجّه إلى السوق. تعرض هذه الشاشة مكانك في الطابور هكذا، وتتحدّث من تلقاء نفسها.',
					},
					turn: {
						time: '11:30 صباحًا',
						title: 'بدء التسوق',
						body: 'عندما يحين دورك، ستخبرك هذه الشاشة، وسنرسل لك رسالة نصية إن سجّلت لتلقيها. توجّه إلى مكتب تسجيل الوصول وأحضر الهاتف الذي سجّلت به — لا نقبل لقطات الشاشة.',
					},
					help: {
						title: 'تحتاج إلى تذكير؟',
						body: 'في «{help}» كل الخطوات.',
					},
					replay: {
						title: 'شاهدها مرة أخرى',
						body: 'يمكنك مشاهدة هذه الجولة مرة أخرى في أي وقت من هذه القائمة.',
					},
				},
			},
			forms: {
				informationLegend: 'معلوماتك',
				pronunciationOffer: 'أضف طريقة نطق اسمك',
				pronunciationLabel: 'يُنطق',
				pronunciationHelp: 'اكتبه كما يُلفظ، حتى نتمكن من مناداة اسمك بشكل صحيح.',
				pronunciationCollapse: 'إخفاء طريقة نطق اسمك',
				lotteryLegend: 'تفاصيل التسجيل في القرعة',
				questionsLegend: 'أسئلة',
				seniorsHint: 'احسب نفسك إذا كان عمرك 55 عامًا أو أكثر',
				exceedsHousehold: 'لا يمكن أن يزيد عدد الأطفال وكبار السن معًا عن عدد أفراد أسرتك.',
				noAdult: 'يجب أن تضم أسرتك شخصًا بالغًا واحدًا على الأقل.',
				savedHousehold: {
					eyebrow: 'من زيارتك السابقة',
					heading: 'هل لا تزال هذه المعلومات صحيحة؟',
					confirm: 'نعم، لا تزال صحيحة',
					change: 'تغيير',
					confirmed: 'تم تأكيد بيانات الأسرة',
					prompt: 'راجع بيانات أسرتك، ثم اضغط على «نعم، لا تزال صحيحة» أو «تغيير».',
					changeHeading: 'تحديث بيانات أسرتك',
					update: 'تحديث',
					cancel: 'إلغاء',
					close: 'إغلاق',
				},
				joinSteps: {
					label: 'قبل الانضمام',
					confirmHousehold: 'أكّد بيانات أسرتك',
					householdConfirmed: 'تم تأكيد بيانات الأسرة',
					answerQuestions: 'أجب عن أسئلة هذا الأسبوع',
					questionsAnswered: 'تمت الإجابة عن الأسئلة',
				},
				countErrors: {
					required: 'أدخل رقمًا.',
					notWholeNumber: 'أدخل عددًا صحيحًا، مثل 2.',
					outOfRange: 'أدخل رقمًا من {min} إلى {max}.',
				},
			},
			identityIndicator: {
				cancelForgetInformation: 'إلغاء',
				closeForgetDialog: 'إغلاق تأكيد نسيان المعلومات',
				closeNotificationsDialog: 'إغلاق تحديثات الرسائل النصية',
				forgetDialogDescription:
					'سيؤدي هذا إلى حذف اسمك ورقم هاتفك ومعرّف الجهاز وبيانات الأسرة المحفوظة من هذا الجهاز. لا يمكن التراجع عن هذا الإجراء.',
				forgetDialogTitle: 'هل تريد نسيان معلوماتك؟',
				forgetInformation: 'نسيان المعلومات',
				heading: 'تم التعرّف عليك على هذا الجهاز',
				notificationsAction: 'أرسل لي التحديثات برسائل نصية',
				notificationsDialogTitle: 'تحديثات الرسائل النصية',
				notificationsEnabled: 'تم تفعيل الإشعارات',
				notificationsError: 'تعذر استرداد حالة إشعاراتك. يرجى المحاولة مرة أخرى لاحقًا.',
				notificationsLoading: 'جارٍ التحقق من حالة الإشعارات…',
				openIdentityMenu: 'فتح قائمة الهوية',
				optOut: 'إلغاء الاشتراك',
				optOutError: 'تعذر إلغاء اشتراكك في التحديثات النصية. يرجى المحاولة مرة أخرى.',
				saveInformationAction: 'حفظ معلوماتي',
				unidentifiedHeading: 'احفظ معلوماتك للمرة القادمة',
				unidentifiedMessage:
					'احفظ اسمك ورقم هاتفك حتى لا تضطر إلى إدخالهما مرة أخرى في زيارتك القادمة. هذا لا يدخلك في القرعة.',
			},
			notificationOptIn: {
				consentLabel:
					'أوافق على تلقي رسائل نصية من The Bay Compassion بشأن مكاني في قائمة الانتظار وحالة زيارتي. يختلف عدد الرسائل، وعادةً لا يتجاوز بضع رسائل في كل يوم سوق. قد تُطبق رسوم الرسائل والبيانات. أرسل STOP لإلغاء الاشتراك أو HELP للمساعدة. الموافقة ليست شرطًا لتلقي خدمة سوق المواد الغذائية.',
				enable: 'تفعيل التحديثات النصية',
				enabled: 'تم تفعيل تحديثات الرسائل النصية لهذه الزيارة والزيارات القادمة.',
				error: 'تعذر تفعيل تحديثات الرسائل النصية. يرجى المحاولة مرة أخرى.',
				optedOut: 'لقد أوقفت الرسائل النصية سابقًا. لتلقي التحديثات مرة أخرى، أرسل START إلى رقمنا.',
				sendStart: 'فتح رسالة نصية تحتوي على START',
				checkStart: 'أرسلت START — تحقق مرة أخرى',
			},
			scheduleInformation: {
				heading: 'يُفتح التسجيل كل يوم سبت الساعة 10:30 صباحًا',
				body: outdent`
					التسجيل لم يُفتح بعد. يرجى العودة يوم السبت الساعة 10:30 صباحًا.
					سيحصل الجميع على فرصة عادلة للدخول في قرعة قائمة الانتظار.
				`,
			},
			notOpenState: {
				heading: 'السوق مغلق',
				subheading:
					'سيفتح التسجيل مجددًا يوم السبت المقبل الساعة 10:30 صباحًا ويستمر 15 دقيقة، حتى الساعة 10:45 صباحًا.',
				lotteryDescription:
					'نظرًا لمحدودية الإمدادات، يستخدم السوق نظام القرعة لاختيار المتسوقين عشوائيًا كل أسبوع. يمكنك التسجيل في القرعة من أي مكان وفي أي وقت خلال الدقائق الخمس عشرة من 10:30 إلى 10:45 صباحًا يوم السبت. لا يؤثر التسجيل المبكر في فرص اختيارك، لذلك لا داعي للعجلة.',
				selectionDescription:
					'ستُجرى القرعة الساعة 10:45 صباحًا، ليتسنى لك الوقت للوصول إلى السوق إذا تم اختيارك. إذا تم اختيارك للتسوق، فسيظهر لك رقم هنا في التطبيق، ويبدأ التسوق الساعة 11:30 صباحًا. وإذا وافقت على تلقي الرسائل النصية، فسيتم إخطارك أيضًا برسالة نصية.',
			},
			registrationClosedState: {
				heading: 'أُغلق التسجيل',
				description:
					'نأسف — لقد فاتتك فترة التسجيل اليوم. سيُفتح التسجيل مرة أخرى يوم السبت المقبل الساعة 10:30 صباحًا، ولكل من يسجّل فرصة متساوية في القرعة.',
			},
			serviceState: {
				inProgressHeading: 'سوق اليوم جارٍ الآن',
				inProgressDescription:
					'أُغلق التسجيل لهذا اليوم. سيفتح التسجيل مجددًا يوم السبت المقبل الساعة 10:30 صباحًا ويستمر 15 دقيقة، حتى الساعة 10:45 صباحًا. لكل من يسجّل الفرصة نفسها.',
			},
			refreshNotice: {
				countdown: 'التحديث خلال {seconds} ثانية',
				updating: 'جارٍ التحديث…',
				noNeedToRefresh: 'لا حاجة إلى التحديث — تُحدَّث هذه الصفحة تلقائيًا.',
				accessibleDescription: 'تُحدَّث هذه الصفحة تلقائيًا. لا حاجة إلى إعادة تحميلها.',
			},
			visitStatus: {
				yourNumberLabel: 'رقمك',
				labels: {
					registered: 'مسجل',
					waiting: 'قيد الانتظار',
					called: 'تم استدعاؤه',
					served: 'تمت خدمته',
					not_placed: 'لم يتم اختياره',
					no_show: 'لم يحضر',
					cancelled: 'ملغاة',
				},
				registered: {
					header: 'أنت مشارك في السحب!',
					details:
						'عند إغلاق التسجيل، يُجرى السحب وتظهر نتيجتك هنا. إذا اشتركت في الرسائل النصية، فسنرسل إليك رسالة أيضًا.',
				},
				waiting: {
					header: 'حصلت على رقم!',
					details: 'توجّه إلى السوق الآن إذا لم تكن هنا بالفعل. سنخبرك هنا عندما يحين دورك.',
					guestsAheadLabel: 'الضيوف الذين أمامك',
					youAreNext: 'أنت التالي',
					nowCallingLabel: 'الرقم الحالي',
					nowCallingNone: 'يبدأ النداء الساعة 11:30 صباحًا',
				},
				called: {
					header: 'تعال إلى تسجيل الوصول الآن',
					headerLate: 'يرجى الإسراع إلى تسجيل الوصول',
					details: 'حان دورك. أحضر هذا الهاتف إلى مكتب تسجيل الوصول.',
					detailsLate:
						'تم النداء على رقمك. هناك آخرون ينتظرون خلفك، لذا يرجى التوجه إلى مكتب تسجيل الوصول الآن.',
					calledMinutesAgoOne: 'تم استدعاؤك قبل دقيقة واحدة',
					calledMinutesAgoOther: 'تم استدعاؤك قبل {minutes} دقيقة',
				},
				served: {
					header: 'شكرًا لحضورك',
					details:
						'اكتملت زيارتك اليوم. سيُفتح التسجيل مرة أخرى يوم السبت المقبل الساعة 10:30 صباحًا.',
				},
				not_placed: {
					header: 'نأسف، ليس هذه المرة',
					details:
						'لم يتم اختيارك في قرعة اليوم. القرعة عشوائية تمامًا، والإمدادات محدودة. نأمل أن نراك يوم السبت المقبل. يُفتح التسجيل الساعة 10:30 صباحًا.',
				},
				no_show: {
					header: 'تم النداء على رقمك',
					details:
						'لم نجدك عند مكتب تسجيل الوصول. إذا كنت لا تزال في السوق، يرجى التوجه إليه الآن وطلب المساعدة من أحد أعضاء الفريق.',
				},
				cancelled: {
					header: 'زيارتك ملغاة',
					details:
						'لن يتم النداء عليك اليوم. إذا حدث هذا عن طريق الخطأ، يرجى التحدث مع أحد أعضاء الفريق. سيُفتح التسجيل مرة أخرى يوم السبت المقبل الساعة 10:30 صباحًا.',
				},
				cancelAction: 'إلغاء هذه الزيارة',
				cancelConfirmation: 'هل تريد إلغاء مكانك في قائمة انتظار هذه الزيارة؟',
				cancelConfirm: 'نعم، إلغاء زيارتي',
				cancelDismiss: 'الاحتفاظ بمكاني',
				updateError: 'تعذر تحديث هذه الزيارة. يرجى طلب المساعدة من فريق السوق.',
			},
		},
		admin: 'الإدارة',
		adminDescription: 'أدوات إدارة قائمة الانتظار ستتوفر قريبًا.',
		adminTitle: 'طريقة أبسط للترحيب بكل جار.',
		age: 'العمر',
		agePlaceholder: 'اختر الفئة العمرية',
		ageRange0to17: '0–17',
		ageRange18to29: '18–29',
		ageRange30to44: '30–44',
		ageRange45to59: '45–59',
		ageRange60to74: '60–74',
		ageRange75plus: '75+',
		authConfigurationDescription:
			'أضف متغيرات بيئة Auth0 من خلال إضافة Auth0 في Netlify، ثم أعد نشر الموقع.',
		authConfigurationRequired: 'لم يتم إعداد تسجيل دخول الإدارة',
		authError: 'تعذر التحقق من جلسة الإدارة. يرجى محاولة تسجيل الدخول مرة أخرى.',
		authLoading: 'جارٍ التحقق من جلسة الإدارة…',
		backToGuest: 'العودة إلى تسجيل الضيف',
		childrenCount: 'عدد الأطفال الذين تتسوق من أجلهم',
		countDecrementLabel: 'إنقاص العدد',
		countIncrementLabel: 'زيادة العدد',
		chooseAnswer: 'اختر إجابة',
		signupView: {
			formDescription:
				'احفظ اسمك ورقم هاتفك حتى لا تضطر إلى إدخالهما مرة أخرى في زيارتك القادمة. هذا لا يدخلك في القرعة ولا يحجز لك مكانًا في قائمة الانتظار.',
			formTitle: 'احفظ معلوماتك للمرة القادمة',
			submit: 'حفظ معلوماتي',
			submitting: 'جارٍ الحفظ…',
			successDescription:
				'لن تضطر إلى إدخالها مرة أخرى في زيارتك القادمة. لم تدخل القرعة ولم يُحجز لك مكان في قائمة الانتظار.',
			successTitle: 'تم حفظ معلوماتك',
		},
		claimView: {
			title: 'إعداد هذا الهاتف',
			description:
				'قام أحد الموظفين بتسجيلك. قم بإعداد هذا الهاتف لمعرفة حالتك وتلقي التحديثات هنا.',
			replaceHeading: 'سيتم استبدال المعلومات المحفوظة',
			replaceWarning:
				'يحتوي هذا الهاتف بالفعل على معلومات محفوظة أو زيارة. سيؤدي إعداده لك إلى استبدالها، ولا يمكن استعادتها.',
			submit: 'إعداد هذا الهاتف',
			submitting: 'جارٍ الإعداد…',
			failed: 'انتهت صلاحية هذا الرمز أو تم استخدامه بالفعل. اطلب رمزًا جديدًا من أحد الموظفين.',
			missingCode: 'هذا الرابط لا يحتوي على رمز. اطلب من أحد الموظفين أن يعرض عليك رمز QR مرة أخرى.',
		},
		kiosk: {
			nowCalling: 'الرقم الحالي',
			nowCallingNone: 'لم يتم النداء على أي رقم بعد',
			stillWaitingFor: 'تم النداء',
			waitingCount: 'في الطابور: {count}',
			moreCount: 'أرقام أخرى: {count}',
			notStarted: 'ستُنادى الأرقام هنا عند افتتاح السوق',
			ended: 'انتهى سوق اليوم. شكرًا لحضوركم!',
			loading: 'جارٍ تحميل الطابور…',
			reconnecting: 'جارٍ إعادة الاتصال…',
			fullscreen: 'ملء الشاشة',
		},
		help: {
			title: 'كيف يعمل',
			introHeading: 'أصبحت قرعة، لا سباقًا.',
			introBody: 'سجّل من أي مكان. للجميع الفرصة نفسها.',
			stepsHeading: 'كل يوم سبت',
			steps: [
				{
					time: '10:30 صباحًا',
					title: 'امسح الرمز',
					body: 'من أي مكان، حتى من المنزل. لديك 15 دقيقة، وتعرض الشاشة الوقت المتبقي.',
				},
				{ title: 'اختر لغتك', body: 'سيتذكرها التطبيق في المرة القادمة.' },
				{
					title: 'املأ النموذج',
					body: 'أدخل اسمك الأول واسم العائلة (من فضلك، لا الأحرف الأولى فقط)، ورقم هاتفك المحمول، وأجب عن بعض الأسئلة حول أسرتك. لا داعي للعجلة، خذ وقتك. ثم اضغط الزر للمشاركة في القرعة.',
				},
				{
					title: 'اضغط «أرسل لي التحديثات برسائل نصية»',
					body: 'اختياري، لكن بدونه لن تصلك أي رسائل نصية.',
				},
				{
					time: '10:45 صباحًا',
					title: 'اعرف إن حصلت على رقم',
					body: 'تعرض شاشتك نتيجة القرعة ومكانك في الطابور. إن حصلت على رقم، توجّه إلى السوق. لا يحصل الجميع على رقم كل أسبوع.',
				},
				{
					time: '11:30 صباحًا',
					title: 'بدء التسوق',
					body: 'عندما يحين دورك، سنرسل لك رسالة نصية (إن أكملت الخطوة 4) وستخبرك شاشتك. توجّه إلى مكتب تسجيل الوصول.',
				},
			],
			phoneNotice: { heading: 'من فضلك، أحضر الهاتف الذي سجّلت به.', body: 'لا نقبل لقطات الشاشة.' },
		},
		firstName: 'الاسم الأول',
		formDescription: 'تساعدنا بعض التفاصيل على الاستعداد لزيارتك.',
		formTitle: 'أخبرنا عنك',
		guest: 'ضيف',
		household: 'عدد الأشخاص في أسرتك',
		householdHint: 'بما في ذلك أنت',
		lastName: 'اسم العائلة',
		language: 'اللغة',
		languagePrompt: 'اختر لغتك',
		marketName: 'The Bay Compassion',
		notifications: {
			registered: {
				title: 'تم تأكيد التسجيل',
				body: 'تم تأكيد تسجيلك.',
			},
			registrationClosed: {
				title: 'أُغلق التسجيل',
				body: 'أُغلق التسجيل. ستبدأ القرعة قريبًا.',
			},
			selected: {
				title: 'تم اختيارك',
				body: 'تم اختيارك. يرجى الانتظار حتى يتم استدعاؤك.',
			},
			notSelected: {
				title: 'نتيجة القرعة',
				body: 'لم يتم اختيارك لخدمة اليوم.',
			},
			called: {
				title: 'حان دورك',
				body: 'يرجى التوجه إلى مكتب تسجيل الوصول الآن.',
			},
			sms: {
				welcome: 'مرحبًا! أصبحت الآن جاهزًا لتلقي التحديثات عبر الرسائل النصية.',
				selected: 'تم اختيارك! رقمك هو {number}. يرجى الانتظار حتى يتم استدعاؤك.',
				notSelected: 'لم يتم اختيارك لخدمة اليوم.',
				called: 'حان دورك. يرجى التوجه إلى مكتب تسجيل الوصول الآن.',
			},
			pushOptIn: {
				enable: 'أبلغني بمستجدات هذه الزيارة',
				denied: 'الإشعارات محظورة. فعّلها من إعدادات جهازك.',
				enabled: 'تم تفعيل الإشعارات لهذه الزيارة.',
				error: 'تعذر تفعيل الإشعارات. يرجى المحاولة مرة أخرى.',
				iosInstall: 'على iPhone أو iPad، أضف هذا التطبيق إلى الشاشة الرئيسية قبل تفعيل الإشعارات.',
				unsupported: 'الإشعارات الفورية غير متاحة على هذا الجهاز.',
			},
		},
		seniorsCount: 'عدد كبار السن (55 فما فوق) الذين تتسوق من أجلهم',
		phone: 'رقم الهاتف',
		privacy: 'تُستخدم معلوماتك فقط لمساعدتنا على خدمتك.',
		privacyPolicy: 'سياسة الخصوصية',
		qrCodeDescription:
			'امسح هذا الرمز بكاميرا الهاتف، أو تفضل بزيارة الرابط أدناه، لفتح صفحة التسجيل.',
		qrCodeImageAlt: 'رمز الاستجابة السريعة الذي يرتبط بصفحة التسجيل',
		qrCodePrint: 'طباعة',
		qrCodeTitle: 'امسح للتسجيل',
		registrationClosesIn: 'يُغلق التسجيل خلال',
		registrationClosesInMinutes: 'يُغلق التسجيل خلال {minutes} دقيقة',
		submissionError: 'تعذر حفظ تسجيلك. يرجى المحاولة مرة أخرى.',
		submit: 'انضم إلى القرعة',
		submitting: 'جارٍ الانضمام إلى القرعة…',
		termsAndConditions: 'الشروط والأحكام',
		statusLoading: 'جارٍ التحقق من حالة السوق اليوم…',
		welcome: 'مرحبًا بكم في سوق الطعام المجتمعي',
	},
	fr: {
		appError: {
			heading: 'Un problème est survenu',
			description:
				'L’application a rencontré un problème et n’a pas pu afficher cette page. Recharger la page suffit généralement.',
			reload: 'Recharger',
		},
		holdingPage: {
			heading: 'La nouvelle application arrive le 31 octobre',
			instructions: 'Gardez ce code QR et scannez-le à nouveau le 31 octobre.',
			currentAppHeading: 'Vous cherchez le marché alimentaire d’aujourd’hui ?',
			currentAppDescription:
				'Utilisez l’application actuelle jusqu’au 31 octobre. Ce code QR est destiné à la nouvelle application.',
			currentAppLink: 'Ouvrir l’application actuelle',
		},
		appBar: {
			openMenu: 'Ouvrir le menu',
			accountMenu: 'Menu du compte',
			website: 'Site web de The Bay Compassion',
			qrCode: 'Code QR',
			staffLogin: 'Connexion du personnel',
			adminPanel: 'Panneau d’administration',
			signOut: 'Se déconnecter',
			sendFeedback: 'Envoyer un commentaire',
			deviceDetails: {
				title: 'Détails de l’appareil',
				close: 'Fermer les détails de l’appareil',
				installIdLabel: 'Identifiant de l’appareil',
				deviceTokenLabel: 'Jeton invité',
				deviceTokenHint: 'Ne le communiquez qu’à un membre du personnel.',
				copy: 'Copier',
				copied: 'Copié',
				copyInstallId: 'Copier l’identifiant de l’appareil',
				copyDeviceToken: 'Copier le jeton invité',
				copyError: 'La copie a échoué. Veuillez réessayer.',
			},
			takeTour: 'Voir la visite guidée',
			colorMode: {
				title: 'Apparence',
				close: 'Fermer les réglages d’apparence',
				system: 'Comme l’appareil',
				light: 'Clair',
				dark: 'Sombre',
			},
			feedbackForm: {
				formTitle: 'Envoyer un commentaire',
				nameLabel: 'Nom (facultatif)',
				namePlaceholder: 'Votre nom',
				messageLabel: 'Votre commentaire',
				messagePlaceholder:
					'Dites-nous ce qui n’a pas fonctionné ou ce qui pourrait être amélioré. Merci de ne pas inclure de données personnelles.',
				submitButtonLabel: 'Envoyer',
				cancelButtonLabel: 'Annuler',
				successMessageText: 'Merci pour votre commentaire !',
				isRequiredLabel: '(obligatoire)',
				errorEmptyMessageText: 'Veuillez écrire un message avant de l’envoyer.',
				errorTimeoutText: 'L’envoi a pris trop de temps. Veuillez réessayer.',
				errorGenericText: 'Votre commentaire n’a pas pu être envoyé. Veuillez réessayer.',
			},
		},
		guestView: {
			presentation: {
				watch: 'Voir le guide des visiteurs',
				close: 'Fermer le guide des visiteurs',
				title: 'Guide du marché pour les visiteurs',
				heading: 'Votre visite à The Bay Compassion',
				summary: 'Un petit guide pour les visiteurs le jour du marché.',
				description:
					'Découvrez comment vous inscrire, consulter le résultat du tirage, suivre votre numéro et vous présenter à l’accueil.',
				play: 'Lire',
				pause: 'Pause',
				restart: 'Recommencer',
				fullscreen: 'Plein écran',
				exitFullscreen: 'Quitter le plein écran',
				soundOn: 'Son activé',
				soundOff: 'Son désactivé',
				noSound: 'Sans son',
				musicOn: 'Musique activée',
				musicOff: 'Musique désactivée',
				volume: 'Volume',
				seek: 'Aller à un moment',
				open: 'Ouvrir la présentation',
				download: 'Télécharger la présentation',
				more: 'Autres présentations',
				chapter: 'Chapitre',
				previousChapter: 'Chapitre précédent',
				nextChapter: 'Chapitre suivant',
				stepByStep: 'Pas à pas',
				stepByStepHint: 'Mettre en pause à la fin de chaque chapitre',
				chapters: {
					welcome: 'Bienvenue',
					openPage: 'Ouvrir la page du marché',
					signUpTime: 'Quand s’inscrire',
					form: 'Remplir le formulaire',
					entered: 'Vous participez au tirage au sort',
					draw: 'Le tirage au sort',
					followLine: 'Suivre la file',
					yourTurn: 'C’est votre tour',
					runningLate: 'En cas de retard',
					complete: 'Visite terminée',
					missedSignUp: 'Si vous avez manqué l’inscription',
					help: 'Obtenir de l’aide',
				},
			},
			languageHint: 'Vous pouvez changer de langue à tout moment en haut de l’écran.',
			helpPrompt: 'Vous ne savez pas quoi faire ?',
			tour: {
				progress: '{current} sur {total}',
				start: 'Montrez-moi',
				next: 'Suivant',
				back: 'Retour',
				skip: 'Passer la visite',
				done: 'Terminé',
				close: 'Fermer la visite',
				steps: {
					welcome: {
						title: 'Bienvenue ! Voici comment ça marche',
						body: 'Rien ne presse. L’inscription reste ouverte 15 minutes, et s’inscrire tôt ne change pas vos chances. Vous pouvez passer cette visite et la revoir à tout moment depuis le menu.',
					},
					language: {
						title: 'Votre langue',
						body: 'Touchez ici pour changer de langue à tout moment. L’app s’en souviendra la prochaine fois.',
					},
					countdown: {
						time: '10 h 30',
						title: 'L’inscription ouvre',
						body: 'Chaque samedi à 10 h 30, l’inscription ouvre pendant 15 minutes. Vous pouvez vous inscrire d’où vous voulez, même de chez vous. Pendant ce temps, un minuteur sur cet écran affiche le temps restant.',
					},
					form: {
						title: 'Remplissez le formulaire',
						body: 'Indiquez vos prénom et nom (pas seulement les initiales, s’il vous plaît), votre portable et quelques questions sur votre foyer. Puis touchez « {submit} ».',
					},
					textUpdates: {
						title: 'Recevez des SMS',
						body: 'Une fois inscrit, touchez « {action} » sur cet écran. C’est facultatif, mais sans cela vous ne recevrez aucun SMS.',
					},
					lottery: {
						time: '10 h 45',
						title: 'Le tirage au sort',
						body: 'Chacun a la même chance. Cet écran indique si vous avez obtenu un numéro. Tout le monde n’en a pas chaque semaine.',
					},
					line: {
						title: 'Votre place dans la file',
						body: 'Si vous avez un numéro, venez au marché. Cet écran affiche votre place dans la file, comme ceci, et se met à jour tout seul.',
					},
					turn: {
						time: '11 h 30',
						title: 'Début des courses',
						body: 'À votre tour, cet écran l’indiquera, et nous vous enverrons un SMS si vous vous êtes inscrit aux SMS. Présentez-vous à l’accueil avec le téléphone utilisé pour l’inscription — les captures d’écran ne sont pas acceptées.',
					},
					help: {
						title: 'Besoin d’un rappel ?',
						body: '« {help} » reprend toutes les étapes.',
					},
					replay: {
						title: 'Revoir la visite',
						body: 'Vous pouvez revoir cette visite à tout moment depuis ce menu.',
					},
				},
			},
			forms: {
				informationLegend: 'Vos informations',
				pronunciationOffer: 'Ajouter la prononciation de votre nom',
				pronunciationLabel: 'Se prononce',
				pronunciationHelp:
					'Écrivez-le comme il se prononce, pour que nous puissions appeler votre nom correctement.',
				pronunciationCollapse: 'Masquer la prononciation de votre nom',
				lotteryLegend: 'Détails de l’inscription au tirage au sort',
				questionsLegend: 'Questions',
				seniorsHint: 'Comptez-vous si vous avez 55 ans ou plus',
				exceedsHousehold:
					'Les enfants et les seniors réunis ne peuvent pas dépasser le nombre de personnes de votre foyer.',
				noAdult: 'Votre foyer doit compter au moins un adulte.',
				savedHousehold: {
					eyebrow: 'De votre dernière visite',
					heading: 'Est-ce toujours exact ?',
					confirm: 'Oui, c’est exact',
					change: 'Modifier',
					confirmed: 'Foyer confirmé',
					prompt: 'Vérifiez votre foyer, puis appuyez sur « Oui, c’est exact » ou « Modifier ».',
					changeHeading: 'Mettre à jour votre foyer',
					update: 'Mettre à jour',
					cancel: 'Annuler',
					close: 'Fermer',
				},
				joinSteps: {
					label: 'Avant de participer',
					confirmHousehold: 'Confirmez votre foyer',
					householdConfirmed: 'Foyer confirmé',
					answerQuestions: 'Répondez aux questions de la semaine',
					questionsAnswered: 'Questions complétées',
				},
				countErrors: {
					required: 'Saisissez un nombre.',
					notWholeNumber: 'Saisissez un nombre entier, par exemple 2.',
					outOfRange: 'Saisissez un nombre entre {min} et {max}.',
				},
			},
			identityIndicator: {
				cancelForgetInformation: 'Annuler',
				closeForgetDialog: 'Fermer la confirmation d’effacement des informations',
				closeNotificationsDialog: 'Fermer les mises à jour par SMS',
				forgetDialogDescription:
					'Cela supprime de cet appareil votre nom, votre numéro de téléphone, l’identifiant de l’appareil et les informations sur votre foyer. Cette action est irréversible.',
				forgetDialogTitle: 'Effacer vos informations ?',
				forgetInformation: 'Effacer mes informations',
				heading: 'Reconnu sur cet appareil',
				notificationsAction: 'M’envoyer les mises à jour par SMS',
				notificationsDialogTitle: 'Mises à jour par SMS',
				notificationsEnabled: 'Notifications activées',
				notificationsError:
					'Nous n’avons pas pu vérifier l’état de vos notifications. Veuillez réessayer plus tard.',
				notificationsLoading: 'Vérification de l’état des notifications…',
				openIdentityMenu: 'Ouvrir le menu d’identité',
				optOut: 'Se désabonner',
				optOutError: 'Nous n’avons pas pu vous désabonner des SMS. Veuillez réessayer.',
				saveInformationAction: 'Enregistrer mes informations',
				unidentifiedHeading: 'Enregistrez vos informations pour la prochaine fois',
				unidentifiedMessage:
					'Enregistrez votre nom et votre numéro de téléphone pour ne pas avoir à les saisir à nouveau lors de votre prochaine visite. Cela ne vous inscrit pas au tirage au sort.',
			},
			notificationOptIn: {
				consentLabel:
					'J’accepte de recevoir des SMS de The Bay Compassion concernant ma place dans la file et l’état de ma visite. La fréquence des messages varie, généralement pas plus de quelques messages par jour de marché. Des frais de messagerie et de données peuvent s’appliquer. Répondez STOP pour vous désabonner ou HELP pour obtenir de l’aide. Votre consentement n’est pas nécessaire pour bénéficier du marché alimentaire.',
				enable: 'Activer les mises à jour par SMS',
				enabled: 'Les mises à jour par SMS sont activées pour cette visite et les suivantes.',
				error: 'Nous n’avons pas pu activer les mises à jour par SMS. Veuillez réessayer.',
				optedOut:
					'Vous avez déjà arrêté les SMS. Pour recevoir à nouveau les mises à jour, envoyez START à notre numéro.',
				sendStart: 'Ouvrir un SMS avec START',
				checkStart: 'J’ai envoyé START — vérifier à nouveau',
			},
			scheduleInformation: {
				heading: 'Les inscriptions ouvrent chaque samedi à 10 h 30',
				body: outdent`
					Les inscriptions ne sont pas encore ouvertes. Veuillez revenir samedi à 10 h 30.
					Tout le monde aura une chance égale de participer au tirage au sort de la file.
				`,
			},
			notOpenState: {
				heading: 'Le marché est fermé',
				subheading:
					'Les inscriptions rouvriront samedi prochain à 10 h 30 et resteront ouvertes 15 minutes, jusqu’à 10 h 45.',
				lotteryDescription:
					'Les provisions étant limitées, le marché utilise un tirage au sort pour choisir les personnes qui peuvent faire leurs courses chaque semaine. Vous pouvez vous inscrire au tirage au sort d’où vous voulez, à tout moment pendant les 15 minutes de 10 h 30 à 10 h 45, le samedi. S’inscrire tôt n’augmente pas vos chances d’être choisi, il n’est donc pas nécessaire de vous presser.',
				selectionDescription:
					'Le tirage au sort aura lieu à 10 h 45, ce qui vous laisse le temps de venir au marché si vous êtes choisi. Si vous êtes choisi, vous recevrez un numéro ici, dans l’application, et les courses commencent à 11 h 30. Si vous acceptez de recevoir des SMS, vous serez également prévenu par SMS.',
			},
			registrationClosedState: {
				heading: 'Les inscriptions sont closes',
				description:
					'Désolés — vous avez manqué le créneau d’inscription d’aujourd’hui. Les inscriptions rouvrent samedi prochain à 10 h 30, et chaque personne inscrite a la même chance au tirage au sort.',
			},
			serviceState: {
				inProgressHeading: 'Le marché d’aujourd’hui est en cours',
				inProgressDescription:
					'Les inscriptions sont closes pour aujourd’hui. Les inscriptions rouvriront samedi prochain à 10 h 30 et resteront ouvertes 15 minutes, jusqu’à 10 h 45. Toutes les personnes inscrites ont la même chance.',
			},
			refreshNotice: {
				countdown: 'Mise à jour dans {seconds} s',
				updating: 'Mise à jour…',
				noNeedToRefresh: 'Inutile d’actualiser — cette page se met à jour toute seule.',
				accessibleDescription:
					'Cette page se met à jour automatiquement. Vous n’avez pas besoin de l’actualiser.',
			},
			visitStatus: {
				yourNumberLabel: 'Votre numéro',
				labels: {
					registered: 'Inscrit',
					waiting: 'En attente',
					called: 'Appelé',
					served: 'Servi',
					not_placed: 'Non retenu',
					no_show: 'Absent',
					cancelled: 'Annulé',
				},
				registered: {
					header: 'Vous participez au tirage au sort !',
					details:
						'À la fermeture des inscriptions, le tirage a lieu et votre résultat s’affiche ici. Si vous êtes inscrit aux SMS, nous vous enverrons aussi un message.',
				},
				waiting: {
					header: 'Vous avez un numéro !',
					details:
						'Rendez-vous au marché maintenant si vous n’y êtes pas déjà. Nous vous indiquerons ici quand ce sera votre tour.',
					guestsAheadLabel: 'Personnes devant vous',
					youAreNext: 'Vous êtes le prochain',
					nowCallingLabel: 'Numéro appelé',
					nowCallingNone: 'Les appels commencent à 11 h 30',
				},
				called: {
					header: 'Présentez-vous à l’accueil',
					headerLate: 'Venez vite à l’accueil',
					details: 'C’est votre tour. Apportez ce téléphone à l’accueil.',
					detailsLate:
						'Votre numéro a été appelé. D’autres personnes attendent après vous, alors veuillez vous présenter à l’accueil maintenant.',
					calledMinutesAgoOne: 'Appelé il y a 1 minute',
					calledMinutesAgoOther: 'Appelé il y a {minutes} minutes',
				},
				served: {
					header: 'Merci d’être venu',
					details:
						'Votre visite d’aujourd’hui est terminée. Les inscriptions rouvrent samedi prochain à 10 h 30.',
				},
				not_placed: {
					header: 'Désolés, pas cette fois',
					details:
						'Vous n’avez pas été tiré au sort aujourd’hui. Le tirage est entièrement aléatoire et les provisions sont limitées. Nous espérons vous revoir samedi prochain. Les inscriptions ouvrent à 10 h 30.',
				},
				no_show: {
					header: 'Votre numéro a été appelé',
					details:
						'Nous ne vous avons pas trouvé à l’accueil. Si vous êtes encore au marché, veuillez vous y rendre maintenant et demander de l’aide à un membre de l’équipe.',
				},
				cancelled: {
					header: 'Votre visite est annulée',
					details:
						'Vous ne serez pas appelé aujourd’hui. S’il s’agit d’une erreur, adressez-vous à un membre de l’équipe. Les inscriptions rouvrent samedi prochain à 10 h 30.',
				},
				cancelAction: 'Annuler cette visite',
				cancelConfirmation: 'Annuler votre place dans la file pour cette visite ?',
				cancelConfirm: 'Oui, annuler ma visite',
				cancelDismiss: 'Garder ma place',
				updateError:
					'Nous n’avons pas pu mettre à jour cette visite. Veuillez demander de l’aide à un membre de l’équipe du marché.',
			},
		},
		admin: 'Administration',
		adminDescription: 'Les outils de gestion de la file seront bientôt disponibles.',
		adminTitle: 'Une façon plus simple d’accueillir chaque voisin.',
		age: 'Âge',
		agePlaceholder: 'Choisissez votre tranche d’âge',
		ageRange0to17: '0–17',
		ageRange18to29: '18–29',
		ageRange30to44: '30–44',
		ageRange45to59: '45–59',
		ageRange60to74: '60–74',
		ageRange75plus: '75+',
		authConfigurationDescription:
			'Ajoutez les variables d’environnement Auth0 au moyen de l’extension Auth0 de Netlify, puis redéployez le site.',
		authConfigurationRequired: 'La connexion administrateur n’est pas configurée',
		authError:
			'Nous n’avons pas pu vérifier votre session administrateur. Veuillez vous reconnecter.',
		authLoading: 'Vérification de votre session administrateur…',
		backToGuest: 'Retour à l’inscription',
		childrenCount: 'Nombre d’enfants pour qui vous faites les courses',
		countDecrementLabel: 'Diminuer le nombre',
		countIncrementLabel: 'Augmenter le nombre',
		chooseAnswer: 'Choisissez une réponse',
		signupView: {
			formDescription:
				'Enregistrez votre nom et votre numéro de téléphone pour ne pas avoir à les saisir à nouveau lors de votre prochaine visite. Cela ne vous inscrit pas au tirage au sort et ne réserve pas de place dans la file.',
			formTitle: 'Enregistrez vos informations pour la prochaine fois',
			submit: 'Enregistrer mes informations',
			submitting: 'Enregistrement…',
			successDescription:
				'Vous n’aurez pas à les saisir à nouveau lors de votre prochaine visite. Vous n’êtes pas inscrit au tirage au sort et n’avez pas réservé de place dans la file.',
			successTitle: 'Vos informations sont enregistrées',
		},
		claimView: {
			title: 'Configurer ce téléphone',
			description:
				'Un membre du personnel vous a ajouté. Configurez ce téléphone pour y voir votre statut et recevoir les mises à jour.',
			replaceHeading: 'Les informations enregistrées seront remplacées',
			replaceWarning:
				'Ce téléphone contient déjà des informations enregistrées ou une visite. Le configurer pour vous les remplace, et elles ne pourront pas être récupérées.',
			submit: 'Configurer ce téléphone',
			submitting: 'Configuration…',
			failed:
				'Ce code a expiré ou a déjà été utilisé. Demandez-en un nouveau à un membre du personnel.',
			missingCode:
				'Il manque le code dans ce lien. Demandez à un membre du personnel de vous montrer à nouveau le code QR.',
		},
		kiosk: {
			nowCalling: 'Numéro appelé',
			nowCallingNone: 'Aucun numéro appelé pour l’instant',
			stillWaitingFor: 'Déjà appelés',
			waitingCount: 'Dans la file : {count}',
			moreCount: '+{count} de plus',
			notStarted: 'Les numéros seront appelés ici dès l’ouverture du marché',
			ended: 'Le marché d’aujourd’hui est terminé. Merci d’être venus !',
			loading: 'Chargement de la file…',
			reconnecting: 'Reconnexion…',
			fullscreen: 'Plein écran',
		},
		help: {
			title: 'Comment ça marche',
			introHeading: 'C’est un tirage au sort, pas une course.',
			introBody: 'Inscrivez-vous d’où vous voulez. Chacun a la même chance.',
			stepsHeading: 'Tous les samedis',
			steps: [
				{
					time: '10 h 30',
					title: 'Scannez le code',
					body: 'D’où vous voulez, même de chez vous. Vous avez 15 minutes et l’écran affiche le temps restant.',
				},
				{ title: 'Choisissez votre langue', body: 'L’app s’en souviendra la prochaine fois.' },
				{
					title: 'Remplissez le formulaire',
					body: 'Indiquez vos prénom et nom (pas seulement les initiales, s’il vous plaît), votre portable et quelques questions sur votre foyer. Rien ne presse, prenez votre temps. Puis touchez le bouton pour participer au tirage.',
				},
				{
					title: 'Touchez « M’envoyer les mises à jour par SMS »',
					body: 'Facultatif, mais sans cela vous ne recevrez aucun SMS.',
				},
				{
					time: '10 h 45',
					title: 'Voyez si vous avez un numéro',
					body: 'Votre écran affiche le résultat et votre place. Avec un numéro, venez au marché. Tout le monde n’en a pas chaque semaine.',
				},
				{
					time: '11 h 30',
					title: 'Début des courses',
					body: 'À votre tour, nous vous enverrons un SMS (si vous avez fait l’étape 4) et votre écran l’indiquera. Présentez-vous à l’accueil.',
				},
			],
			phoneNotice: {
				heading: 'Merci d’apporter le téléphone utilisé pour l’inscription.',
				body: 'Les captures d’écran ne sont pas acceptées.',
			},
		},
		firstName: 'Prénom',
		formDescription: 'Quelques informations nous aident à préparer votre visite.',
		formTitle: 'Parlez-nous de vous',
		guest: 'Invité',
		household: 'Nombre de personnes dans votre foyer',
		householdHint: 'Comptez-vous aussi',
		lastName: 'Nom de famille',
		language: 'Langue',
		languagePrompt: 'Choisissez votre langue',
		marketName: 'The Bay Compassion',
		notifications: {
			registered: {
				title: 'Inscription confirmée',
				body: 'Votre inscription est confirmée.',
			},
			registrationClosed: {
				title: 'Inscriptions closes',
				body: 'Les inscriptions sont closes. Le tirage au sort va bientôt commencer.',
			},
			selected: {
				title: 'Vous avez été choisi',
				body: 'Vous avez été choisi. Veuillez attendre d’être appelé.',
			},
			notSelected: {
				title: 'Résultat du tirage au sort',
				body: 'Vous n’avez pas été choisi pour le service d’aujourd’hui.',
			},
			called: {
				title: 'C’est votre tour',
				body: 'Veuillez vous présenter à l’accueil maintenant.',
			},
			sms: {
				welcome: 'Bienvenue ! Vous recevrez désormais les mises à jour par SMS.',
				selected:
					'Vous avez été choisi ! Votre numéro est le {number}. Veuillez attendre d’être appelé.',
				notSelected: 'Vous n’avez pas été choisi pour le service d’aujourd’hui.',
				called: 'C’est votre tour. Veuillez vous présenter à l’accueil maintenant.',
			},
			pushOptIn: {
				enable: 'M’avertir pour cette visite',
				denied: 'Les notifications sont bloquées. Activez-les dans les réglages de votre appareil.',
				enabled: 'Les notifications sont activées pour cette visite.',
				error: 'Nous n’avons pas pu activer les notifications. Veuillez réessayer.',
				iosInstall:
					'Sur iPhone ou iPad, ajoutez cette application à votre écran d’accueil avant d’activer les notifications.',
				unsupported: 'Les notifications push ne sont pas disponibles sur cet appareil.',
			},
		},
		seniorsCount: 'Nombre de personnes âgées (55 ans et plus) pour qui vous faites les courses',
		phone: 'Numéro de téléphone',
		privacy: 'Vos informations servent uniquement à mieux vous servir.',
		privacyPolicy: 'Politique de confidentialité',
		qrCodeDescription:
			'Scannez ce code avec l’appareil photo d’un téléphone, ou ouvrez le lien ci-dessous, pour accéder à la page d’inscription.',
		qrCodeImageAlt: 'Code QR menant à la page d’inscription',
		qrCodePrint: 'Imprimer',
		qrCodeTitle: 'Scannez pour vous inscrire',
		registrationClosesIn: 'Fin des inscriptions dans',
		registrationClosesInMinutes: 'Fin des inscriptions dans {minutes} min',
		submissionError: 'Nous n’avons pas pu enregistrer votre inscription. Veuillez réessayer.',
		submit: 'Participer au tirage au sort',
		submitting: 'Inscription au tirage au sort…',
		termsAndConditions: 'Conditions générales',
		statusLoading: 'Vérification de l’état du marché d’aujourd’hui…',
		welcome: 'Bienvenue au marché alimentaire communautaire',
	},
	pt: {
		appError: {
			heading: 'Algo deu errado',
			description:
				'O app encontrou um problema e não conseguiu mostrar esta página. Recarregar geralmente resolve.',
			reload: 'Recarregar',
		},
		holdingPage: {
			heading: 'O novo aplicativo será lançado em 31 de outubro',
			instructions: 'Guarde este código QR e escaneie-o novamente em 31 de outubro.',
			currentAppHeading: 'Está procurando o mercado de alimentos de hoje?',
			currentAppDescription:
				'Use o aplicativo atual até 31 de outubro. Este código QR é para o novo aplicativo.',
			currentAppLink: 'Abrir o aplicativo atual',
		},
		appBar: {
			openMenu: 'Abrir menu',
			accountMenu: 'Menu da conta',
			website: 'Site da The Bay Compassion',
			qrCode: 'Código QR',
			staffLogin: 'Acesso da equipe',
			adminPanel: 'Painel de administração',
			signOut: 'Sair',
			sendFeedback: 'Enviar comentário',
			deviceDetails: {
				title: 'Detalhes do dispositivo',
				close: 'Fechar detalhes do dispositivo',
				installIdLabel: 'ID do dispositivo',
				deviceTokenLabel: 'Token do visitante',
				deviceTokenHint: 'Compartilhe apenas com um membro da equipe.',
				copy: 'Copiar',
				copied: 'Copiado',
				copyInstallId: 'Copiar ID do dispositivo',
				copyDeviceToken: 'Copiar token do visitante',
				copyError: 'Não foi possível copiar. Tente novamente.',
			},
			takeTour: 'Ver o guia',
			colorMode: {
				title: 'Aparência',
				close: 'Fechar configurações de aparência',
				system: 'Igual ao dispositivo',
				light: 'Claro',
				dark: 'Escuro',
			},
			feedbackForm: {
				formTitle: 'Enviar comentário',
				nameLabel: 'Nome (opcional)',
				namePlaceholder: 'Seu nome',
				messageLabel: 'Seu comentário',
				messagePlaceholder:
					'Conte o que deu errado ou o que poderia melhorar. Não inclua dados pessoais.',
				submitButtonLabel: 'Enviar',
				cancelButtonLabel: 'Cancelar',
				successMessageText: 'Obrigado pelo seu comentário!',
				isRequiredLabel: '(obrigatório)',
				errorEmptyMessageText: 'Escreva uma mensagem antes de enviar.',
				errorTimeoutText: 'O envio demorou demais. Tente novamente.',
				errorGenericText: 'Não foi possível enviar seu comentário. Tente novamente.',
			},
		},
		guestView: {
			presentation: {
				watch: 'Ver o guia para visitantes',
				close: 'Fechar o guia para visitantes',
				title: 'Guia do mercado para visitantes',
				heading: 'Sua visita à The Bay Compassion',
				summary: 'Um guia breve para visitantes no dia do mercado.',
				description:
					'Saiba como se inscrever, ver o resultado do sorteio, acompanhar seu número e ir ao balcão de atendimento.',
				play: 'Reproduzir',
				pause: 'Pausar',
				restart: 'Recomeçar',
				fullscreen: 'Tela cheia',
				exitFullscreen: 'Sair da tela cheia',
				soundOn: 'Som ativado',
				soundOff: 'Som desativado',
				noSound: 'Sem som',
				musicOn: 'Música ativada',
				musicOff: 'Música desativada',
				volume: 'Volume',
				seek: 'Avançar ou voltar',
				open: 'Abrir apresentação',
				download: 'Baixar apresentação',
				more: 'Mais apresentações',
				chapter: 'Capítulo',
				previousChapter: 'Capítulo anterior',
				nextChapter: 'Próximo capítulo',
				stepByStep: 'Passo a passo',
				stepByStepHint: 'Pausar ao final de cada capítulo',
				chapters: {
					welcome: 'Boas-vindas',
					openPage: 'Abrir a página do mercado',
					signUpTime: 'Quando se inscrever',
					form: 'Preencher o formulário',
					entered: 'Você está no sorteio',
					draw: 'O sorteio',
					followLine: 'Acompanhar a fila',
					yourTurn: 'É a sua vez',
					runningLate: 'Em caso de atraso',
					complete: 'Visita concluída',
					missedSignUp: 'Se você perdeu a inscrição',
					help: 'Como obter ajuda',
				},
			},
			languageHint: 'Você pode mudar o idioma a qualquer momento no topo da tela.',
			helpPrompt: 'Não sabe o que fazer?',
			tour: {
				progress: '{current} de {total}',
				start: 'Quero ver',
				next: 'Próximo',
				back: 'Voltar',
				skip: 'Pular o guia',
				done: 'Concluir',
				close: 'Fechar o guia',
				steps: {
					welcome: {
						title: 'Boas-vindas! Veja como funciona',
						body: 'Não precisa ter pressa. As inscrições ficam abertas por 15 minutos, e se inscrever mais cedo não muda suas chances. Você pode pular este guia e voltar a ele pelo menu a qualquer momento.',
					},
					language: {
						title: 'Seu idioma',
						body: 'Toque aqui para mudar o idioma a qualquer momento. O aplicativo lembra sua escolha para a próxima vez.',
					},
					countdown: {
						time: '10h30',
						title: 'Abertura das inscrições',
						body: 'Todo sábado às 10h30, as inscrições abrem por 15 minutos. Você pode se inscrever de qualquer lugar, até de casa. Enquanto estiverem abertas, um cronômetro nesta tela mostra quanto tempo falta.',
					},
					form: {
						title: 'Preencha o formulário',
						body: 'Informe seu nome e sobrenome (não apenas as iniciais), seu celular e responda a algumas perguntas sobre as pessoas que moram com você. Depois, toque em “{submit}”.',
					},
					textUpdates: {
						title: 'Receba atualizações por SMS',
						body: 'Depois de se inscrever, toque em “{action}” nesta tela. É opcional, mas sem isso você não receberá mensagens de texto.',
					},
					lottery: {
						time: '10h45',
						title: 'Realização do sorteio',
						body: 'Todos têm a mesma chance. Esta tela mostra se você recebeu um número. Nem todos recebem um número a cada semana.',
					},
					line: {
						title: 'Seu lugar na fila',
						body: 'Se você recebeu um número, vá ao mercado. Esta tela mostra seu lugar na fila, como neste exemplo, e se atualiza sozinha.',
					},
					turn: {
						time: '11h30',
						title: 'Início das compras',
						body: 'Quando for sua vez, esta tela avisará, e enviaremos um SMS se você tiver ativado as mensagens. Vá ao balcão de atendimento e leve o celular usado na inscrição — não aceitamos capturas de tela.',
					},
					help: {
						title: 'Precisa relembrar?',
						body: '“{help}” tem todas as etapas.',
					},
					replay: {
						title: 'Veja novamente',
						body: 'Você pode ver este guia novamente a qualquer momento por este menu.',
					},
				},
			},
			forms: {
				informationLegend: 'Seus dados',
				pronunciationOffer: 'Adicionar a pronúncia do seu nome',
				pronunciationLabel: 'Pronuncia-se',
				pronunciationHelp:
					'Escreva como se pronuncia, para que possamos chamar seu nome corretamente.',
				pronunciationCollapse: 'Ocultar a pronúncia do seu nome',
				lotteryLegend: 'Dados da inscrição no sorteio',
				questionsLegend: 'Perguntas',
				seniorsHint: 'Inclua você se tiver 55 anos ou mais',
				exceedsHousehold:
					'Crianças e idosos juntos não podem ser mais do que as pessoas da sua casa.',
				noAdult: 'Sua casa precisa incluir pelo menos um adulto.',
				savedHousehold: {
					eyebrow: 'Da sua última visita',
					heading: 'Isto ainda está correto?',
					confirm: 'Sim, está correto',
					change: 'Alterar',
					confirmed: 'Domicílio confirmado',
					prompt: 'Confira os dados do seu domicílio e toque em “Sim, está correto” ou “Alterar”.',
					changeHeading: 'Atualize seu domicílio',
					update: 'Atualizar',
					cancel: 'Cancelar',
					close: 'Fechar',
				},
				joinSteps: {
					label: 'Antes de participar',
					confirmHousehold: 'Confirme seu domicílio',
					householdConfirmed: 'Domicílio confirmado',
					answerQuestions: 'Responda às perguntas desta semana',
					questionsAnswered: 'Perguntas respondidas',
				},
				countErrors: {
					required: 'Digite um número.',
					notWholeNumber: 'Digite um número inteiro, como 2.',
					outOfRange: 'Digite um número de {min} a {max}.',
				},
			},
			identityIndicator: {
				cancelForgetInformation: 'Cancelar',
				closeForgetDialog: 'Fechar confirmação de exclusão dos dados',
				closeNotificationsDialog: 'Fechar atualizações por SMS',
				forgetDialogDescription:
					'Isso remove deste dispositivo seu nome, telefone, ID do dispositivo e dados das pessoas que moram com você. Essa ação não pode ser desfeita.',
				forgetDialogTitle: 'Esquecer seus dados?',
				forgetInformation: 'Esquecer dados',
				heading: 'Reconhecido neste dispositivo',
				notificationsAction: 'Receber atualizações por SMS',
				notificationsDialogTitle: 'Atualizações por SMS',
				notificationsEnabled: 'Notificações ativadas',
				notificationsError:
					'Não foi possível consultar o status das suas notificações. Tente novamente mais tarde.',
				notificationsLoading: 'Consultando status das notificações…',
				openIdentityMenu: 'Abrir menu de identificação',
				optOut: 'Cancelar recebimento',
				optOutError: 'Não foi possível cancelar o recebimento de SMS. Tente novamente.',
				saveInformationAction: 'Salvar meus dados',
				unidentifiedHeading: 'Salve seus dados para a próxima vez',
				unidentifiedMessage:
					'Salve seu nome e telefone para não precisar informá-los na próxima visita. Isso não inscreve você no sorteio.',
			},
			notificationOptIn: {
				consentLabel:
					'Concordo em receber mensagens de texto da The Bay Compassion sobre minha situação na fila e minha visita. A frequência varia, geralmente não mais do que algumas mensagens por dia de mercado. Podem ser cobradas tarifas de mensagens e dados. Responda STOP para cancelar ou HELP para obter ajuda. O consentimento não é necessário para receber atendimento no mercado de alimentos.',
				enable: 'Ativar atualizações por SMS',
				enabled: 'As atualizações por SMS estão ativadas para esta visita e as próximas.',
				error: 'Não foi possível ativar as atualizações por SMS. Tente novamente.',
				optedOut:
					'Você cancelou as mensagens de texto anteriormente. Para voltar a receber atualizações, envie START para o nosso número.',
				sendStart: 'Abrir mensagem com START',
				checkStart: 'Enviei START — verificar novamente',
			},
			scheduleInformation: {
				heading: 'As inscrições abrem todo sábado às 10h30',
				body: 'As inscrições ainda não estão abertas. Volte no sábado às 10h30.\nTodos terão uma chance justa de participar do sorteio para entrar na fila.',
			},
			notOpenState: {
				heading: 'O mercado está fechado',
				subheading:
					'As inscrições abrirão novamente no próximo sábado às 10h30 e ficarão abertas por 15 minutos, até as 10h45.',
				lotteryDescription:
					'Como os alimentos são limitados, o mercado usa um sorteio para selecionar aleatoriamente quem poderá fazer compras a cada semana. Você pode se inscrever de qualquer lugar, a qualquer momento durante os 15 minutos entre 10h30 e 10h45 de sábado. Inscrever-se mais cedo não altera suas chances de ser selecionado, então não precisa ter pressa.',
				selectionDescription:
					'O sorteio será realizado às 10h45, dando tempo para ir ao mercado se você for selecionado. Se for selecionado para fazer compras, receberá um número aqui no aplicativo, e as compras começam às 11h30. Se autorizar o recebimento de mensagens de texto, também será avisado por SMS.',
			},
			registrationClosedState: {
				heading: 'As inscrições foram encerradas',
				description:
					'Sentimos muito — você perdeu o horário de inscrição de hoje. As inscrições abrem novamente no próximo sábado às 10h30, e todos os inscritos têm a mesma chance no sorteio.',
			},
			serviceState: {
				inProgressHeading: 'O mercado de hoje está em andamento',
				inProgressDescription:
					'As inscrições de hoje estão encerradas. As inscrições abrirão novamente no próximo sábado às 10h30 e ficarão abertas por 15 minutos, até as 10h45. Todos que se inscrevem têm a mesma chance.',
			},
			refreshNotice: {
				countdown: 'Atualização em {seconds}s',
				updating: 'Atualizando…',
				noNeedToRefresh: 'Não precisa atualizar — esta página se atualiza sozinha.',
				accessibleDescription:
					'Esta página se atualiza automaticamente. Você não precisa atualizá-la.',
			},
			visitStatus: {
				yourNumberLabel: 'Seu número',
				labels: {
					registered: 'Inscrito',
					waiting: 'Aguardando',
					called: 'Chamado',
					served: 'Atendido',
					not_placed: 'Sem lugar na fila',
					no_show: 'Não compareceu',
					cancelled: 'Cancelado',
				},
				registered: {
					header: 'Você está no sorteio!',
					details:
						'Quando as inscrições fecharem, o sorteio será feito e seu resultado aparecerá aqui. Se você se cadastrou para receber mensagens de texto, também enviaremos uma mensagem.',
				},
				waiting: {
					header: 'Você recebeu um número!',
					details:
						'Vá ao mercado agora se ainda não estiver aqui. Avisaremos aqui quando for sua vez.',
					guestsAheadLabel: 'Pessoas à sua frente',
					youAreNext: 'Você é o próximo',
					nowCallingLabel: 'Chamando agora',
					nowCallingNone: 'As chamadas começam às 11h30',
				},
				called: {
					header: 'Venha ao atendimento agora',
					headerLate: 'Por favor, venha logo ao atendimento',
					details: 'É a sua vez. Traga este celular ao balcão de atendimento.',
					detailsLate:
						'Seu número foi chamado. Há outras pessoas esperando atrás de você, então vá ao balcão de atendimento agora.',
					calledMinutesAgoOne: 'Chamado há 1 minuto',
					calledMinutesAgoOther: 'Chamado há {minutes} minutos',
				},
				served: {
					header: 'Obrigado pela visita',
					details:
						'Sua visita de hoje foi concluída. As inscrições abrem novamente no próximo sábado às 10h30.',
				},
				not_placed: {
					header: 'Sentimos muito, não desta vez',
					details:
						'Você não foi sorteado hoje. O sorteio é totalmente aleatório e os alimentos são limitados. Esperamos ver você no próximo sábado. As inscrições abrem às 10h30.',
				},
				no_show: {
					header: 'Seu número foi chamado',
					details:
						'Não encontramos você no balcão de atendimento. Se ainda estiver no mercado, vá até lá agora e peça ajuda a um membro da equipe.',
				},
				cancelled: {
					header: 'Sua visita está cancelada',
					details:
						'Você não será chamado hoje. Se isso aconteceu por engano, fale com um membro da equipe. As inscrições abrem novamente no próximo sábado às 10h30.',
				},
				cancelAction: 'Cancelar esta visita',
				cancelConfirmation: 'Cancelar seu lugar na fila para esta visita?',
				cancelConfirm: 'Sim, cancelar minha visita',
				cancelDismiss: 'Manter meu lugar',
				updateError:
					'Não foi possível atualizar esta visita. Peça ajuda a um membro da equipe do mercado.',
			},
		},
		admin: 'Administração',
		adminDescription: 'As ferramentas de gerenciamento da fila estarão disponíveis em breve.',
		adminTitle: 'Uma forma mais simples de acolher cada vizinho.',
		age: 'Idade',
		agePlaceholder: 'Selecione sua faixa etária',
		ageRange0to17: '0–17',
		ageRange18to29: '18–29',
		ageRange30to44: '30–44',
		ageRange45to59: '45–59',
		ageRange60to74: '60–74',
		ageRange75plus: '75+',
		authConfigurationDescription:
			'Adicione as variáveis de ambiente do Auth0 pela extensão Auth0 do Netlify e publique o site novamente.',
		authConfigurationRequired: 'O acesso da administração não está configurado',
		authError: 'Não foi possível verificar sua sessão de administrador. Tente entrar novamente.',
		authLoading: 'Verificando sua sessão de administrador…',
		backToGuest: 'Voltar à entrada de visitantes',
		childrenCount: 'Número de crianças para quem você está fazendo compras',
		countDecrementLabel: 'Diminuir quantidade',
		countIncrementLabel: 'Aumentar quantidade',
		chooseAnswer: 'Escolha uma resposta',
		signupView: {
			formDescription:
				'Salve seu nome e telefone para não precisar informá-los na próxima visita. Isso não inscreve você no sorteio nem reserva um lugar na fila.',
			formTitle: 'Salve seus dados para a próxima vez',
			submit: 'Salvar meus dados',
			submitting: 'Salvando…',
			successDescription:
				'Você não precisará informar seus dados novamente na próxima visita. Você não está inscrito no sorteio e não reservou um lugar na fila.',
			successTitle: 'Seus dados foram salvos',
		},
		claimView: {
			title: 'Configure este celular',
			description:
				'Um membro da equipe cadastrou você. Configure este celular para ver sua situação e receber atualizações aqui.',
			replaceHeading: 'Os dados salvos serão substituídos',
			replaceWarning:
				'Este celular já tem dados salvos ou uma visita. Ao configurá-lo para você, esses dados serão substituídos e não poderão ser recuperados.',
			submit: 'Configurar este celular',
			submitting: 'Configurando…',
			failed: 'Este código expirou ou já foi usado. Peça um novo código a um membro da equipe.',
			missingCode:
				'Falta o código neste link. Peça a um membro da equipe para mostrar o código QR novamente.',
		},
		kiosk: {
			nowCalling: 'Chamando agora',
			nowCallingNone: 'Nenhum número chamado ainda',
			stillWaitingFor: 'Já chamados',
			waitingCount: 'Na fila: {count}',
			moreCount: '+{count} mais',
			notStarted: 'Os números serão chamados aqui quando o mercado abrir',
			ended: 'O mercado de hoje terminou. Obrigado pela visita!',
			loading: 'Carregando a fila…',
			reconnecting: 'Reconectando…',
			fullscreen: 'Tela cheia',
		},
		help: {
			title: 'Como funciona',
			introHeading: 'Agora é um sorteio, não uma corrida.',
			introBody: 'Inscreva-se de qualquer lugar. Todos têm a mesma chance.',
			stepsHeading: 'Todo sábado',
			steps: [
				{
					time: '10h30',
					title: 'Escaneie o código',
					body: 'Escaneie de qualquer lugar, até de casa. Você tem 15 minutos, e a tela mostra quanto tempo falta.',
				},
				{
					title: 'Escolha seu idioma',
					body: 'O aplicativo lembra sua escolha para a próxima vez.',
				},
				{
					title: 'Preencha o formulário',
					body: 'Informe seu nome e sobrenome (não apenas as iniciais), celular e responda a algumas perguntas sobre as pessoas que moram com você. Não precisa ter pressa. Depois, toque no botão para participar do sorteio.',
				},
				{
					title: 'Toque em “Receber atualizações por SMS”',
					body: 'É opcional, mas sem isso você não receberá mensagens de texto.',
				},
				{
					time: '10h45',
					title: 'Veja se você recebeu um número',
					body: 'O sorteio é realizado e a tela mostra o resultado e seu lugar na fila. Se você recebeu um número, vá ao mercado. Nem todos recebem um número a cada semana.',
				},
				{
					time: '11h30',
					title: 'Início das compras',
					body: 'Quando for sua vez, enviaremos um SMS (se você fez a etapa 4) e a tela avisará. Vá ao balcão de atendimento.',
				},
			],
			phoneNotice: {
				heading: 'Leve o celular usado na inscrição.',
				body: 'Não aceitamos capturas de tela.',
			},
		},
		firstName: 'Nome',
		formDescription: 'Alguns dados nos ajudam a preparar sua visita.',
		formTitle: 'Conte sobre você',
		guest: 'Visitante',
		household: 'Número de pessoas que moram com você',
		householdHint: 'Inclua você',
		lastName: 'Sobrenome',
		language: 'Idioma',
		languagePrompt: 'Escolha seu idioma',
		marketName: 'The Bay Compassion',
		notifications: {
			registered: {
				title: 'Inscrição confirmada',
				body: 'Sua inscrição está confirmada.',
			},
			registrationClosed: {
				title: 'Inscrições encerradas',
				body: 'As inscrições foram encerradas. O sorteio começará em breve.',
			},
			selected: {
				title: 'Você foi selecionado',
				body: 'Você foi selecionado. Aguarde até ser chamado.',
			},
			notSelected: {
				title: 'Resultado do sorteio',
				body: 'Você não foi selecionado para o atendimento de hoje.',
			},
			called: {
				title: 'É a sua vez',
				body: 'Vá ao balcão de atendimento agora.',
			},
			sms: {
				welcome: 'Boas-vindas! Você já pode receber atualizações por SMS.',
				selected: 'Você foi selecionado! Seu número é {number}. Aguarde até ser chamado.',
				notSelected: 'Você não foi selecionado para o atendimento de hoje.',
				called: 'É a sua vez. Vá ao balcão de atendimento agora.',
			},
			pushOptIn: {
				enable: 'Receber notificações sobre esta visita',
				denied: 'As notificações estão bloqueadas. Ative-as nas configurações do dispositivo.',
				enabled: 'As notificações estão ativadas para esta visita.',
				error: 'Não foi possível ativar as notificações. Tente novamente.',
				iosInstall:
					'No iPhone ou iPad, adicione este aplicativo à tela de início antes de ativar as notificações.',
				unsupported: 'As notificações push não estão disponíveis neste dispositivo.',
			},
		},
		seniorsCount: 'Número de pessoas com 55 anos ou mais para quem você está fazendo compras',
		phone: 'Número de telefone',
		privacy: 'Seus dados são usados apenas para ajudar no seu atendimento.',
		privacyPolicy: 'Política de privacidade',
		qrCodeDescription:
			'Escaneie este código com a câmera do celular ou acesse o link abaixo para abrir a página de entrada.',
		qrCodeImageAlt: 'Código QR que leva à página de entrada',
		qrCodePrint: 'Imprimir',
		qrCodeTitle: 'Escaneie para se apresentar',
		registrationClosesIn: 'As inscrições encerram em',
		registrationClosesInMinutes: 'As inscrições encerram em {minutes} min',
		submissionError: 'Não foi possível salvar sua entrada. Tente novamente.',
		submit: 'Participar do sorteio',
		submitting: 'Entrando no sorteio…',
		termsAndConditions: 'Termos e condições',
		statusLoading: 'Consultando a situação do mercado de hoje…',
		welcome: 'Boas-vindas ao mercado comunitário de alimentos',
	},
	ru: {
		appError: {
			heading: 'Что-то пошло не так',
			description:
				'В приложении произошла ошибка, и эта страница не открылась. Обычно помогает перезагрузка.',
			reload: 'Перезагрузить',
		},
		holdingPage: {
			heading: 'Новое приложение запустится 31 октября',
			instructions: 'Сохраните этот QR-код и отсканируйте его снова 31 октября.',
			currentAppHeading: 'Ищете сегодняшний продуктовый рынок?',
			currentAppDescription:
				'Пользуйтесь текущим приложением до 31 октября. Этот QR-код предназначен для нового приложения.',
			currentAppLink: 'Открыть текущее приложение',
		},
		appBar: {
			openMenu: 'Открыть меню',
			accountMenu: 'Меню аккаунта',
			website: 'Сайт The Bay Compassion',
			qrCode: 'QR-код',
			staffLogin: 'Вход для сотрудников',
			adminPanel: 'Панель администратора',
			signOut: 'Выйти',
			sendFeedback: 'Отправить отзыв',
			deviceDetails: {
				title: 'Данные устройства',
				close: 'Закрыть данные устройства',
				installIdLabel: 'Идентификатор устройства',
				deviceTokenLabel: 'Токен посетителя',
				deviceTokenHint: 'Сообщайте его только сотруднику.',
				copy: 'Копировать',
				copied: 'Скопировано',
				copyInstallId: 'Копировать идентификатор устройства',
				copyDeviceToken: 'Копировать токен посетителя',
				copyError: 'Не удалось скопировать. Попробуйте ещё раз.',
			},
			takeTour: 'Посмотреть инструкцию',
			colorMode: {
				title: 'Оформление',
				close: 'Закрыть настройки оформления',
				system: 'Как на устройстве',
				light: 'Светлое',
				dark: 'Тёмное',
			},
			feedbackForm: {
				formTitle: 'Отправить отзыв',
				nameLabel: 'Имя (необязательно)',
				namePlaceholder: 'Ваше имя',
				messageLabel: 'Ваш отзыв',
				messagePlaceholder:
					'Расскажите, что пошло не так или что можно улучшить. Не указывайте личные данные.',
				submitButtonLabel: 'Отправить',
				cancelButtonLabel: 'Отмена',
				successMessageText: 'Спасибо за ваш отзыв!',
				isRequiredLabel: '(обязательно)',
				errorEmptyMessageText: 'Напишите сообщение перед отправкой.',
				errorTimeoutText: 'Отправка заняла слишком много времени. Попробуйте ещё раз.',
				errorGenericText: 'Не удалось отправить отзыв. Попробуйте ещё раз.',
			},
		},
		guestView: {
			presentation: {
				watch: 'Смотреть руководство для гостей',
				close: 'Закрыть руководство для гостей',
				title: 'Руководство для посетителей рынка',
				heading: 'Ваш визит в The Bay Compassion',
				summary: 'Краткое руководство для посетителей в день работы рынка.',
				description:
					'Узнайте, как зарегистрироваться, посмотреть результат жеребьёвки, следить за своим номером и подойти к стойке регистрации.',
				play: 'Воспроизвести',
				pause: 'Пауза',
				restart: 'Начать заново',
				fullscreen: 'Полный экран',
				exitFullscreen: 'Выйти из полноэкранного режима',
				soundOn: 'Звук включён',
				soundOff: 'Звук выключен',
				noSound: 'Без звука',
				musicOn: 'Музыка включена',
				musicOff: 'Музыка выключена',
				volume: 'Громкость',
				seek: 'Перемотка',
				open: 'Открыть презентацию',
				download: 'Скачать презентацию',
				more: 'Другие презентации',
				chapter: 'Глава',
				previousChapter: 'Предыдущая глава',
				nextChapter: 'Следующая глава',
				stepByStep: 'Шаг за шагом',
				stepByStepHint: 'Пауза в конце каждой главы',
				chapters: {
					welcome: 'Добро пожаловать',
					openPage: 'Откройте страницу рынка',
					signUpTime: 'Когда регистрироваться',
					form: 'Заполните форму',
					entered: 'Вы участвуете в жеребьёвке',
					draw: 'Жеребьёвка',
					followLine: 'Следите за очередью',
					yourTurn: 'Ваша очередь',
					runningLate: 'Если вы опаздываете',
					complete: 'Визит завершён',
					missedSignUp: 'Если вы пропустили регистрацию',
					help: 'Как получить помощь',
				},
			},
			languageHint: 'Вы можете изменить язык вверху экрана в любое время.',
			helpPrompt: 'Не знаете, что делать?',
			tour: {
				progress: '{current} из {total}',
				start: 'Покажите мне',
				next: 'Далее',
				back: 'Назад',
				skip: 'Пропустить инструкцию',
				done: 'Готово',
				close: 'Закрыть инструкцию',
				steps: {
					welcome: {
						title: 'Добро пожаловать! Вот как всё устроено',
						body: 'Торопиться не нужно. Регистрация открыта 15 минут, и ранняя регистрация не влияет на ваши шансы. Вы можете пропустить эту инструкцию и вернуться к ней через меню в любое время.',
					},
					language: {
						title: 'Ваш язык',
						body: 'Нажмите здесь, чтобы изменить язык в любое время. Приложение запомнит ваш выбор.',
					},
					countdown: {
						time: '10:30',
						title: 'Начало регистрации',
						body: 'Каждую субботу в 10:30 регистрация открывается на 15 минут. Зарегистрироваться можно откуда угодно, даже из дома. Пока регистрация открыта, таймер на этом экране показывает оставшееся время.',
					},
					form: {
						title: 'Заполните форму',
						body: 'Укажите имя и фамилию (пожалуйста, не только инициалы), номер мобильного телефона и ответьте на несколько вопросов о вашей семье. Затем нажмите «{submit}».',
					},
					textUpdates: {
						title: 'Получайте обновления по SMS',
						body: 'После регистрации нажмите «{action}» на этом экране. Это необязательно, но без этого SMS приходить не будут.',
					},
					lottery: {
						time: '10:45',
						title: 'Проведение жеребьёвки',
						body: 'У всех одинаковые шансы. На этом экране будет видно, получили ли вы номер. Не все получают номер каждую неделю.',
					},
					line: {
						title: 'Ваше место в очереди',
						body: 'Если вы получили номер, отправляйтесь на рынок. Этот экран показывает ваше место в очереди, как в этом примере, и обновляется автоматически.',
					},
					turn: {
						time: '11:30',
						title: 'Начало покупок',
						body: 'Когда подойдёт ваша очередь, на экране появится сообщение, и мы отправим SMS, если вы подписались на сообщения. Подойдите к стойке регистрации и возьмите телефон, с которого вы регистрировались — снимки экрана не принимаются.',
					},
					help: {
						title: 'Нужно напоминание?',
						body: 'В разделе «{help}» описаны все шаги.',
					},
					replay: {
						title: 'Посмотрите ещё раз',
						body: 'Вы можете снова открыть эту инструкцию через это меню в любое время.',
					},
				},
			},
			forms: {
				informationLegend: 'Ваши данные',
				pronunciationOffer: 'Добавить произношение имени',
				pronunciationLabel: 'Произносится как',
				pronunciationHelp:
					'Напишите имя так, как оно звучит, чтобы мы могли правильно его произнести.',
				pronunciationCollapse: 'Скрыть произношение имени',
				lotteryLegend: 'Данные для участия в жеребьёвке',
				questionsLegend: 'Вопросы',
				seniorsHint: 'Включите себя, если вам 55 лет или больше',
				exceedsHousehold:
					'Детей и пожилых людей вместе не может быть больше, чем людей в вашей семье.',
				noAdult: 'В вашей семье должен быть хотя бы один взрослый.',
				savedHousehold: {
					eyebrow: 'С вашего прошлого визита',
					heading: 'Всё ещё верно?',
					confirm: 'Да, всё верно',
					change: 'Изменить',
					confirmed: 'Данные о семье подтверждены',
					prompt: 'Проверьте данные о семье и нажмите «Да, всё верно» или «Изменить».',
					changeHeading: 'Обновите данные о семье',
					update: 'Обновить',
					cancel: 'Отмена',
					close: 'Закрыть',
				},
				joinSteps: {
					label: 'Перед записью',
					confirmHousehold: 'Подтвердите данные о семье',
					householdConfirmed: 'Данные о семье подтверждены',
					answerQuestions: 'Ответьте на вопросы этой недели',
					questionsAnswered: 'Ответы даны',
				},
				countErrors: {
					required: 'Введите число.',
					notWholeNumber: 'Введите целое число, например 2.',
					outOfRange: 'Введите число от {min} до {max}.',
				},
			},
			identityIndicator: {
				cancelForgetInformation: 'Отмена',
				closeForgetDialog: 'Закрыть подтверждение удаления данных',
				closeNotificationsDialog: 'Закрыть обновления по SMS',
				forgetDialogDescription:
					'С этого устройства будут удалены сохранённые имя, номер телефона, идентификатор устройства и данные о вашей семье. Это действие нельзя отменить.',
				forgetDialogTitle: 'Удалить ваши данные?',
				forgetInformation: 'Удалить данные',
				heading: 'Вы опознаны на этом устройстве',
				notificationsAction: 'Получать обновления по SMS',
				notificationsDialogTitle: 'Обновления по SMS',
				notificationsEnabled: 'Уведомления включены',
				notificationsError: 'Не удалось проверить статус уведомлений. Попробуйте позже.',
				notificationsLoading: 'Проверка статуса уведомлений…',
				openIdentityMenu: 'Открыть меню идентификации',
				optOut: 'Отписаться',
				optOutError: 'Не удалось отключить обновления по SMS. Попробуйте ещё раз.',
				saveInformationAction: 'Сохранить мои данные',
				unidentifiedHeading: 'Сохраните данные для следующего визита',
				unidentifiedMessage:
					'Сохраните имя и номер телефона, чтобы не вводить их снова при следующем визите. Это не регистрирует вас для участия в жеребьёвке.',
			},
			notificationOptIn: {
				consentLabel:
					'Я соглашаюсь получать SMS от The Bay Compassion о моей очереди и статусе визита. Частота сообщений может меняться; обычно их не более нескольких за день работы рынка. Может взиматься плата за сообщения и передачу данных. Ответьте STOP, чтобы отписаться, или HELP, чтобы получить помощь. Согласие не является условием получения продуктов на рынке.',
				enable: 'Включить обновления по SMS',
				enabled: 'Обновления по SMS включены для этого и будущих визитов.',
				error: 'Не удалось включить обновления по SMS. Попробуйте ещё раз.',
				optedOut:
					'Ранее вы отказались от SMS. Чтобы снова получать обновления, отправьте START на наш номер.',
				sendStart: 'Открыть SMS с текстом START',
				checkStart: 'Команда START отправлена — проверить снова',
			},
			scheduleInformation: {
				heading: 'Регистрация открывается каждую субботу в 10:30',
				body: 'Регистрация ещё не открыта. Вернитесь в субботу в 10:30.\nУ всех будут равные шансы участвовать в жеребьёвке мест в очереди.',
			},
			notOpenState: {
				heading: 'Рынок закрыт',
				subheading:
					'Регистрация снова откроется в следующую субботу в 10:30 и продлится 15 минут, до 10:45.',
				lotteryDescription:
					'Запасы продуктов ограничены, поэтому каждую неделю рынок случайным образом выбирает покупателей с помощью жеребьёвки. Зарегистрироваться можно откуда угодно в течение 15 минут с 10:30 до 10:45 в субботу. Ранняя регистрация не влияет на шансы быть выбранным, поэтому торопиться не нужно.',
				selectionDescription:
					'Жеребьёвка пройдёт в 10:45, чтобы у выбранных участников было время добраться до рынка. Если вас выберут для покупок, вы получите номер здесь, в приложении. Покупки начнутся в 11:30. Если вы согласились получать SMS, мы также уведомим вас сообщением.',
			},
			registrationClosedState: {
				heading: 'Регистрация закрыта',
				description:
					'К сожалению, вы пропустили сегодняшнюю регистрацию. Регистрация снова откроется в следующую субботу в 10:30. У всех зарегистрированных равные шансы в жеребьёвке.',
			},
			serviceState: {
				inProgressHeading: 'Сегодняшний рынок уже работает',
				inProgressDescription:
					'Регистрация на сегодня закрыта. Регистрация снова откроется в следующую субботу в 10:30 и продлится 15 минут, до 10:45. У всех, кто зарегистрировался, одинаковые шансы.',
			},
			refreshNotice: {
				countdown: 'Обновление через {seconds} с',
				updating: 'Обновление…',
				noNeedToRefresh: 'Обновлять страницу не нужно — она обновляется автоматически.',
				accessibleDescription: 'Эта страница обновляется автоматически. Вам не нужно её обновлять.',
			},
			visitStatus: {
				yourNumberLabel: 'Ваш номер',
				labels: {
					registered: 'Зарегистрирован',
					waiting: 'Ожидает',
					called: 'Вызван',
					served: 'Обслужен',
					not_placed: 'Без места в очереди',
					no_show: 'Не явился',
					cancelled: 'Отменён',
				},
				registered: {
					header: 'Вы участвуете в жеребьёвке!',
					details:
						'Когда регистрация закроется, пройдёт жеребьёвка, и ваш результат появится здесь. Если вы подписались на SMS, мы также пришлём вам сообщение.',
				},
				waiting: {
					header: 'Вы получили номер!',
					details:
						'Если вы ещё не на месте, отправляйтесь на рынок сейчас. Мы сообщим здесь, когда подойдёт ваша очередь.',
					guestsAheadLabel: 'Посетителей перед вами',
					youAreNext: 'Вы следующие',
					nowCallingLabel: 'Сейчас вызывают',
					nowCallingNone: 'Вызов начнётся в 11:30',
				},
				called: {
					header: 'Подойдите к регистрации',
					headerLate: 'Пожалуйста, поторопитесь',
					details: 'Ваша очередь. Возьмите этот телефон с собой к стойке регистрации.',
					detailsLate:
						'Ваш номер уже вызвали. За вами ждут другие люди, поэтому, пожалуйста, подойдите к стойке регистрации сейчас.',
					calledMinutesAgoOne: 'Вызов был 1 минуту назад',
					calledMinutesAgoOther: 'С момента вызова прошло минут: {minutes}',
				},
				served: {
					header: 'Спасибо за визит',
					details:
						'Ваш сегодняшний визит завершён. Регистрация снова откроется в следующую субботу в 10:30.',
				},
				not_placed: {
					header: 'К сожалению, не в этот раз',
					details:
						'Вас не выбрали в сегодняшней жеребьёвке. Она полностью случайна, а запасы продуктов ограничены. Надеемся увидеть вас в следующую субботу. Регистрация открывается в 10:30.',
				},
				no_show: {
					header: 'Ваш номер вызвали',
					details:
						'Мы не нашли вас у стойки регистрации. Если вы ещё на рынке, пожалуйста, подойдите туда сейчас и обратитесь за помощью к сотруднику.',
				},
				cancelled: {
					header: 'Ваш визит отменён',
					details:
						'Сегодня вас не вызовут. Если это произошло по ошибке, обратитесь к сотруднику. Регистрация снова откроется в следующую субботу в 10:30.',
				},
				cancelAction: 'Отменить этот визит',
				cancelConfirmation: 'Отменить ваше место в очереди для этого визита?',
				cancelConfirm: 'Да, отменить мой визит',
				cancelDismiss: 'Сохранить моё место',
				updateError: 'Не удалось обновить данные визита. Попросите помощи у сотрудника рынка.',
			},
		},
		admin: 'Администратор',
		adminDescription: 'Инструменты управления очередью скоро появятся.',
		adminTitle: 'Простой способ радушно принять каждого соседа.',
		age: 'Возраст',
		agePlaceholder: 'Выберите вашу возрастную группу',
		ageRange0to17: '0–17',
		ageRange18to29: '18–29',
		ageRange30to44: '30–44',
		ageRange45to59: '45–59',
		ageRange60to74: '60–74',
		ageRange75plus: '75+',
		authConfigurationDescription:
			'Добавьте переменные окружения Auth0 через расширение Auth0 в Netlify, затем повторно разверните сайт.',
		authConfigurationRequired: 'Вход для администратора не настроен',
		authError: 'Не удалось проверить вашу сессию администратора. Попробуйте войти снова.',
		authLoading: 'Проверка сессии администратора…',
		backToGuest: 'Вернуться к регистрации посетителей',
		childrenCount: 'Количество детей, для которых вы берёте продукты',
		countDecrementLabel: 'Уменьшить количество',
		countIncrementLabel: 'Увеличить количество',
		chooseAnswer: 'Выберите ответ',
		signupView: {
			formDescription:
				'Сохраните имя и номер телефона, чтобы не вводить их снова при следующем визите. Это не регистрирует вас для участия в жеребьёвке и не сохраняет место в очереди.',
			formTitle: 'Сохраните данные для следующего визита',
			submit: 'Сохранить мои данные',
			submitting: 'Сохранение…',
			successDescription:
				'При следующем визите вам не нужно будет вводить данные снова. Вы не зарегистрированы для участия в жеребьёвке, и место в очереди за вами не закреплено.',
			successTitle: 'Ваши данные сохранены',
		},
		claimView: {
			title: 'Настройте этот телефон',
			description:
				'Сотрудник добавил вас в систему. Настройте этот телефон, чтобы видеть свой статус и получать обновления здесь.',
			replaceHeading: 'Сохранённые данные будут заменены',
			replaceWarning:
				'На этом телефоне уже есть сохранённые данные или визит. Настройка телефона для вас заменит их без возможности восстановления.',
			submit: 'Настроить этот телефон',
			submitting: 'Настройка…',
			failed: 'Срок действия кода истёк или он уже использован. Попросите у сотрудника новый код.',
			missingCode: 'В этой ссылке отсутствует код. Попросите сотрудника снова показать QR-код.',
		},
		kiosk: {
			nowCalling: 'Сейчас вызывают',
			nowCallingNone: 'Номера ещё не вызывались',
			stillWaitingFor: 'Уже вызваны',
			waitingCount: 'В очереди: {count}',
			moreCount: 'Ещё: {count}',
			notStarted: 'Когда рынок откроется, здесь будут вызывать номера',
			ended: 'Сегодняшний рынок завершён. Спасибо за визит!',
			loading: 'Загрузка очереди…',
			reconnecting: 'Повторное подключение…',
			fullscreen: 'Полный экран',
		},
		help: {
			title: 'Как это работает',
			introHeading: 'Теперь это жеребьёвка, а не гонка.',
			introBody: 'Регистрируйтесь откуда угодно. У всех одинаковые шансы.',
			stepsHeading: 'Каждую субботу',
			steps: [
				{
					time: '10:30',
					title: 'Отсканируйте код',
					body: 'Сканируйте откуда угодно, даже из дома. У вас есть 15 минут, и экран показывает оставшееся время.',
				},
				{
					title: 'Выберите язык',
					body: 'Приложение запомнит ваш выбор.',
				},
				{
					title: 'Заполните форму',
					body: 'Укажите имя и фамилию (пожалуйста, не только инициалы), номер мобильного телефона и ответьте на несколько вопросов о вашей семье. Торопиться не нужно. Затем нажмите кнопку для участия в жеребьёвке.',
				},
				{
					title: 'Нажмите «Получать обновления по SMS»',
					body: 'Это необязательно, но без этого SMS приходить не будут.',
				},
				{
					time: '10:45',
					title: 'Проверьте, получили ли вы номер',
					body: 'После жеребьёвки на экране появятся результат и ваше место в очереди. Если вы получили номер, отправляйтесь на рынок. Не все получают номер каждую неделю.',
				},
				{
					time: '11:30',
					title: 'Начало покупок',
					body: 'Когда подойдёт ваша очередь, мы отправим SMS (если вы выполнили шаг 4), а на экране появится сообщение. Подойдите к стойке регистрации.',
				},
			],
			phoneNotice: {
				heading: 'Возьмите телефон, с которого вы регистрировались.',
				body: 'Снимки экрана не принимаются.',
			},
		},
		firstName: 'Имя',
		formDescription: 'Несколько сведений помогут нам подготовиться к вашему визиту.',
		formTitle: 'Расскажите о себе',
		guest: 'Посетитель',
		household: 'Количество человек в вашей семье',
		householdHint: 'Включая вас',
		lastName: 'Фамилия',
		language: 'Язык',
		languagePrompt: 'Выберите язык',
		marketName: 'The Bay Compassion',
		notifications: {
			registered: {
				title: 'Регистрация подтверждена',
				body: 'Ваша регистрация подтверждена.',
			},
			registrationClosed: {
				title: 'Регистрация закрыта',
				body: 'Регистрация закрыта. Жеребьёвка скоро начнётся.',
			},
			selected: {
				title: 'Вас выбрали',
				body: 'Вас выбрали. Пожалуйста, дождитесь вызова.',
			},
			notSelected: {
				title: 'Результат жеребьёвки',
				body: 'Вас не выбрали для сегодняшнего обслуживания.',
			},
			called: {
				title: 'Ваша очередь',
				body: 'Пожалуйста, подойдите к стойке регистрации сейчас.',
			},
			sms: {
				welcome: 'Добро пожаловать! Теперь вы будете получать обновления по SMS.',
				selected: 'Вас выбрали! Ваш номер — {number}. Пожалуйста, дождитесь вызова.',
				notSelected: 'Вас не выбрали для сегодняшнего обслуживания.',
				called: 'Ваша очередь. Пожалуйста, подойдите к стойке регистрации сейчас.',
			},
			pushOptIn: {
				enable: 'Получать уведомления об этом визите',
				denied: 'Уведомления заблокированы. Включите их в настройках устройства.',
				enabled: 'Уведомления включены для этого визита.',
				error: 'Не удалось включить уведомления. Попробуйте ещё раз.',
				iosInstall:
					'На iPhone или iPad добавьте это приложение на главный экран перед включением уведомлений.',
				unsupported: 'Push-уведомления недоступны на этом устройстве.',
			},
		},
		seniorsCount: 'Количество людей старшего возраста (55+), для которых вы берёте продукты',
		phone: 'Номер телефона',
		privacy: 'Ваши данные используются только для того, чтобы помочь нам обслужить вас.',
		privacyPolicy: 'Политика конфиденциальности',
		qrCodeDescription:
			'Отсканируйте этот код камерой телефона или перейдите по ссылке ниже, чтобы открыть страницу регистрации.',
		qrCodeImageAlt: 'QR-код со ссылкой на страницу регистрации',
		qrCodePrint: 'Печать',
		qrCodeTitle: 'Отсканируйте для регистрации',
		registrationClosesIn: 'Регистрация закроется через',
		registrationClosesInMinutes: 'Регистрация закроется через {minutes} мин',
		submissionError: 'Не удалось сохранить вашу регистрацию. Попробуйте ещё раз.',
		submit: 'Участвовать в жеребьёвке',
		submitting: 'Регистрация на жеребьёвку…',
		termsAndConditions: 'Условия использования',
		statusLoading: 'Проверка статуса сегодняшнего рынка…',
		welcome: 'Добро пожаловать на общественный продуктовый рынок',
	},
} as const satisfies Record<Locale, Translation>;
