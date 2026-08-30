import { outdent } from 'outdent';

export const languages = [
	{ code: 'en', label: 'English' },
	{ code: 'es', label: 'Español' },
	{ code: 'fa', label: 'فارسی' },
	{ code: 'tl', label: 'Tagalog' },
	{ code: 'vi', label: 'Tiếng Việt' },
	{ code: 'zh', label: '中文' },
	{ code: 'ar', label: 'العربية' },
] as const;

export type Locale = (typeof languages)[number]['code'];

export interface GuestViewTranslations {
	identityIndicator: {
		closeNotificationsDialog: string;
		heading: string;
		notificationsAction: string;
		notificationsDialogTitle: string;
		notificationsEnabled: string;
		notificationsError: string;
		notificationsLoading: string;
		saveInformationAction: string;
		unidentifiedHeading: string;
		unidentifiedMessage: string;
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
		endedHeading: string;
		endedDescription: string;
	};
}

export interface SignupViewTranslations {
	formDescription: string;
	formTitle: string;
	submit: string;
	submitting: string;
	successDescription: string;
	successTitle: string;
}

export interface Translation {
	guestView: GuestViewTranslations;
	signupView: SignupViewTranslations;
	admin: string;
	adminDescription: string;
	adminEyebrow: string;
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
	cancelVisit: string;
	cancelVisitConfirm: string;
	childrenCount: string;
	compassionFood: string;
	countBackLabel: string;
	countOtherLabel: string;
	countOtherPlaceholder: string;
	currentStatus: string;
	chooseAnswer: string;
	firstName: string;
	formDescription: string;
	formTitle: string;
	guest: string;
	heroCopy: string;
	household: string;
	householdHint: string;
	lastName: string;
	language: string;
	languagePrompt: string;
	marketName: string;
	notificationCalledBody: string;
	notificationCalledTitle: string;
	notificationNotSelectedBody: string;
	notificationNotSelectedTitle: string;
	notificationRegisteredBody: string;
	notificationRegisteredTitle: string;
	notificationRegistrationClosedBody: string;
	notificationRegistrationClosedTitle: string;
	notificationSelectedBody: string;
	notificationSelectedTitle: string;
	notificationsEnable: string;
	notificationsDenied: string;
	notificationsEnabled: string;
	notificationsError: string;
	notificationsIosInstall: string;
	notificationsUnsupported: string;
	smsConsentLabel: string;
	smsEnable: string;
	smsEnabled: string;
	smsError: string;
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
	signedInAs: string;
	signOut: string;
	submissionError: string;
	submit: string;
	submitting: string;
	termsAndConditions: string;
	successDescription: string;
	successTitle: string;
	queuePositionLabel: string;
	guestsAheadOfYou: string;
	youAreNext: string;
	calledTitle: string;
	calledDescription: string;
	statusCancelled: string;
	statusCalled: string;
	statusLoading: string;
	statusNoShow: string;
	statusNotPlaced: string;
	statusRegistered: string;
	statusServed: string;
	statusWaiting: string;
	visitError: string;
	welcome: string;
}

export const translations = {
	en: {
		guestView: {
			identityIndicator: {
				closeNotificationsDialog: 'Close notification updates',
				heading: 'Recognized on this device',
				notificationsAction: 'Notify Me About Updates',
				notificationsDialogTitle: 'Notification Updates',
				notificationsEnabled: 'Notifications Enabled',
				notificationsError:
					'We could not retrieve your notification status. Please try again later.',
				notificationsLoading: 'Checking notification status…',
				saveInformationAction: 'Save my information',
				unidentifiedHeading: 'Save your information for next time',
				unidentifiedMessage:
					'Save your name and phone number so you do not need to enter them again on your next visit. This does not enter you in the lottery.',
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
					'Registration will open again next Saturday at 10:30 AM and remain open until 11:30 AM.',
				lotteryDescription:
					'Because supplies are limited, the market uses a lottery system to randomly select shoppers each week. You may register for the lottery at any time during the one-hour window from 10:30 AM to 11:30 AM on Saturday. Registering early does not affect your chances of being selected, so there is no need to register early.',
				selectionDescription:
					'The lottery will run at 11:30 AM. If you are selected to shop, you will receive a number here in the app. If you consent to receiving text messages, you will also be notified by text message.',
			},
			registrationClosedState: {
				heading: 'Registration is closed',
				description: 'Please check with a market team member for help.',
			},
			serviceState: {
				inProgressHeading: 'Today’s market is underway',
				inProgressDescription:
					'Registration is closed for today. If you haven’t checked in yet, please speak with a market team member.',
				endedHeading: 'Today’s market has ended',
				endedDescription:
					'Thank you for being part of our community. Check the schedule above for the next one.',
			},
		},
		admin: 'Admin',
		adminDescription: 'Queue management tools are coming soon.',
		adminEyebrow: '',
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
		cancelVisit: 'Cancel this visit',
		cancelVisitConfirm: 'Cancel your place in the queue for this visit?',
		childrenCount: 'Number of children you’re shopping for',
		compassionFood: 'Compassion Food',
		countBackLabel: 'Choose a smaller number',
		countOtherLabel: 'Or enter another number',
		countOtherPlaceholder: 'Enter value',
		currentStatus: 'Current status',
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
		firstName: 'First name',
		formDescription: 'A few details help us prepare your visit.',
		formTitle: 'Tell us about you',
		guest: 'Guest',
		heroCopy: 'Together we flourish. Check in below, and our team will take care of the rest.',
		household: 'Number of people in your household',
		householdHint: 'Include yourself',
		lastName: 'Last name',
		language: 'Language',
		languagePrompt: 'Choose your language',
		marketName: 'The Bay Compassion',
		notificationCalledBody: 'Please come up for service now.',
		notificationCalledTitle: 'It’s your turn',
		notificationNotSelectedBody: 'You were not selected for today’s service.',
		notificationNotSelectedTitle: 'Lottery result',
		notificationRegisteredBody: 'Your registration is confirmed.',
		notificationRegisteredTitle: 'Registration confirmed',
		notificationRegistrationClosedBody: 'Registration has closed. The lottery will begin soon.',
		notificationRegistrationClosedTitle: 'Registration closed',
		notificationSelectedBody: 'You were selected. Please wait until you are called.',
		notificationSelectedTitle: 'You were selected',
		notificationsEnable: 'Notify me about this visit',
		notificationsDenied: 'Notifications are blocked. Enable them in your device settings.',
		notificationsEnabled: 'Notifications are enabled for this visit.',
		notificationsError: 'We could not enable notifications. Please try again.',
		notificationsIosInstall:
			'On iPhone or iPad, add this app to your Home Screen before enabling notifications.',
		notificationsUnsupported: 'Push notifications are not available on this device.',
		smsConsentLabel:
			'I agree to receive text messages from The Bay Compassion about my queue and visit status. Message frequency varies, typically no more than a few messages per market day. Message and data rates may apply. Reply STOP to unsubscribe or HELP for assistance. Consent is not required to receive food market service.',
		smsEnable: 'Enable text updates',
		smsEnabled: 'Text message updates are enabled for this and future visits.',
		smsError: 'We could not enable text updates. Please try again.',
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
		signedInAs: 'Signed in as',
		signOut: 'Sign out',
		submissionError: 'We could not save your check-in. Please try again.',
		submit: 'Join the queue',
		submitting: 'Joining the queue…',
		termsAndConditions: 'Terms & Conditions',
		successDescription: 'We’ll let you know when it’s your turn. Thank you for being here.',
		successTitle: 'You’re in the queue!',
		queuePositionLabel: 'Your place in line',
		guestsAheadOfYou: 'Guests ahead of you',
		youAreNext: 'You are next',
		calledTitle: 'It’s your turn',
		calledDescription: 'Please come to the table now.',
		statusCancelled: 'Cancelled',
		statusCalled: 'Called',
		statusLoading: 'Checking today’s market status…',
		statusNoShow: 'No show',
		statusNotPlaced: 'Not placed',
		statusRegistered: 'Registered',
		statusServed: 'Served',
		statusWaiting: 'Waiting',
		visitError: 'We could not update this visit. Please ask a market team member for help.',
		welcome: 'Welcome to the community food market',
	},
	es: {
		guestView: {
			identityIndicator: {
				closeNotificationsDialog: 'Cerrar actualizaciones de notificaciones',
				heading: 'Reconocido en este dispositivo',
				notificationsAction: 'Notificarme sobre novedades',
				notificationsDialogTitle: 'Actualizaciones por notificación',
				notificationsEnabled: 'Notificaciones activadas',
				notificationsError:
					'No pudimos consultar el estado de sus notificaciones. Inténtelo de nuevo más tarde.',
				notificationsLoading: 'Consultando el estado de las notificaciones…',
				saveInformationAction: 'Guardar mi información',
				unidentifiedHeading: 'Guarde su información para la próxima vez',
				unidentifiedMessage:
					'Guarde su nombre y número de teléfono para no tener que ingresarlos de nuevo en su próxima visita. Esto no le inscribe en el sorteo.',
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
					'La inscripción volverá a abrir el próximo sábado a las 10:30 a. m. y permanecerá abierta hasta las 11:30 a. m.',
				lotteryDescription:
					'Debido a que los suministros son limitados, el mercado utiliza un sistema de lotería para seleccionar al azar a las personas que podrán comprar cada semana. Puede inscribirse en la lotería en cualquier momento durante el período de una hora entre las 10:30 a. m. y las 11:30 a. m. del sábado. Inscribirse temprano no afecta sus probabilidades de ser seleccionado, por lo que no es necesario hacerlo con anticipación.',
				selectionDescription:
					'La lotería se realizará a las 11:30 a. m. Si es seleccionado para comprar, recibirá un número aquí en la aplicación. Si acepta recibir mensajes de texto, también recibirá una notificación por mensaje de texto.',
			},
			registrationClosedState: {
				heading: 'El registro está cerrado',
				description: 'Pida ayuda a un miembro del equipo del mercado.',
			},
			serviceState: {
				inProgressHeading: 'El mercado de hoy está en curso',
				inProgressDescription:
					'El registro está cerrado por hoy. Si aún no se ha registrado, hable con un miembro del equipo del mercado.',
				endedHeading: 'El mercado de hoy ha terminado',
				endedDescription:
					'Gracias por ser parte de nuestra comunidad. Consulte el horario indicado arriba para el próximo mercado.',
			},
		},
		admin: 'Administración',
		adminDescription: 'Las herramientas para gestionar la fila estarán disponibles pronto.',
		adminEyebrow: 'Equipo del mercado',
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
		cancelVisit: 'Cancelar esta visita',
		cancelVisitConfirm: '¿Cancelar su lugar en la fila para esta visita?',
		childrenCount: 'Número de niños para quienes está comprando',
		compassionFood: 'Alimentos con Compasión',
		countBackLabel: 'Elegir un número menor',
		countOtherLabel: 'O escriba otro número',
		countOtherPlaceholder: 'Ingrese un valor',
		currentStatus: 'Estado actual',
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
		firstName: 'Nombre',
		formDescription: 'Unos detalles nos ayudan a preparar su visita.',
		formTitle: 'Cuéntenos sobre usted',
		guest: 'Invitado',
		heroCopy: 'Juntos florecemos. Regístrese abajo y nuestro equipo se encargará del resto.',
		household: 'Número de personas en su hogar',
		householdHint: 'Inclúyase',
		lastName: 'Apellido',
		language: 'Idioma',
		languagePrompt: 'Elija su idioma',
		marketName: 'The Bay Compassion',
		notificationCalledBody: 'Por favor, acérquese ahora para recibir el servicio.',
		notificationCalledTitle: 'Es su turno',
		notificationNotSelectedBody: 'No fue seleccionado para el servicio de hoy.',
		notificationNotSelectedTitle: 'Resultado del sorteo',
		notificationRegisteredBody: 'Su registro está confirmado.',
		notificationRegisteredTitle: 'Registro confirmado',
		notificationRegistrationClosedBody: 'El registro cerró. El sorteo comenzará pronto.',
		notificationRegistrationClosedTitle: 'Registro cerrado',
		notificationSelectedBody: 'Fue seleccionado. Espere hasta que le llamemos.',
		notificationSelectedTitle: 'Fue seleccionado',
		notificationsEnable: 'Notificarme sobre esta visita',
		notificationsDenied:
			'Las notificaciones están bloqueadas. Actívelas en la configuración de su dispositivo.',
		notificationsEnabled: 'Las notificaciones están activadas para esta visita.',
		notificationsError: 'No pudimos activar las notificaciones. Inténtelo de nuevo.',
		notificationsIosInstall:
			'En iPhone o iPad, agregue esta aplicación a la pantalla de inicio antes de activar las notificaciones.',
		notificationsUnsupported: 'Las notificaciones push no están disponibles en este dispositivo.',
		smsConsentLabel:
			'Acepto recibir mensajes de texto de The Bay Compassion sobre mi lugar en la fila y el estado de mi visita. La frecuencia varía; normalmente no recibiré más de unos pocos mensajes por día de mercado. Pueden aplicarse tarifas de mensajes y datos. Responda STOP para cancelar o HELP para recibir ayuda. El consentimiento no es necesario para recibir servicio en el mercado de alimentos.',
		smsEnable: 'Activar actualizaciones por mensaje de texto',
		smsEnabled:
			'Las actualizaciones por mensaje de texto están activadas para esta visita y futuras visitas.',
		smsError: 'No pudimos activar las actualizaciones por mensaje de texto. Inténtelo de nuevo.',
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
		signedInAs: 'Sesión iniciada como',
		signOut: 'Cerrar sesión',
		submissionError: 'No pudimos guardar su registro. Inténtelo de nuevo.',
		submit: 'Unirse a la fila',
		submitting: 'Uniéndose a la fila…',
		termsAndConditions: 'Términos y condiciones',
		successDescription: 'Le avisaremos cuando sea su turno. Gracias por estar aquí.',
		successTitle: '¡Ya está en la fila!',
		queuePositionLabel: 'Su lugar en la fila',
		guestsAheadOfYou: 'Invitados delante de usted',
		youAreNext: 'Usted es el siguiente',
		calledTitle: 'Es su turno',
		calledDescription: 'Por favor, acérquese al mostrador ahora.',
		statusCancelled: 'Cancelado',
		statusCalled: 'Llamado',
		statusLoading: 'Consultando el estado del mercado de hoy…',
		statusNoShow: 'No se presentó',
		statusNotPlaced: 'Sin lugar',
		statusRegistered: 'Registrado',
		statusServed: 'Atendido',
		statusWaiting: 'En espera',
		visitError: 'No pudimos actualizar esta visita. Pida ayuda al equipo del mercado.',
		welcome: 'Bienvenido al mercado comunitario de alimentos',
	},
	fa: {
		guestView: {
			identityIndicator: {
				closeNotificationsDialog: 'بستن به‌روزرسانی اعلان‌ها',
				heading: 'شناسایی‌شده در این دستگاه',
				notificationsAction: 'مرا از به‌روزرسانی‌ها باخبر کنید',
				notificationsDialogTitle: 'به‌روزرسانی‌های اعلان',
				notificationsEnabled: 'اعلان‌ها فعال هستند',
				notificationsError: 'وضعیت اعلان‌های شما دریافت نشد. لطفاً بعداً دوباره تلاش کنید.',
				notificationsLoading: 'در حال بررسی وضعیت اعلان‌ها…',
				saveInformationAction: 'ذخیره اطلاعات من',
				unidentifiedHeading: 'اطلاعات خود را برای دفعه بعد ذخیره کنید',
				unidentifiedMessage:
					'نام و شماره تلفن خود را ذخیره کنید تا در مراجعه بعدی نیازی به وارد کردن دوباره آن‌ها نداشته باشید. این کار شما را وارد قرعه‌کشی نمی‌کند.',
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
					'ثبت‌نام شنبه آینده ساعت ۱۰:۳۰ صبح دوباره آغاز می‌شود و تا ساعت ۱۱:۳۰ صبح ادامه خواهد داشت.',
				lotteryDescription:
					'به دلیل محدود بودن اقلام، بازار برای انتخاب تصادفی خریداران هر هفته از سیستم قرعه‌کشی استفاده می‌کند. می‌توانید در هر زمانی از بازه یک‌ساعته روز شنبه، از ساعت ۱۰:۳۰ تا ۱۱:۳۰ صبح، برای قرعه‌کشی ثبت‌نام کنید. ثبت‌نام زودتر تأثیری بر شانس انتخاب شدن شما ندارد، بنابراین نیازی نیست زود ثبت‌نام کنید.',
				selectionDescription:
					'قرعه‌کشی ساعت ۱۱:۳۰ صبح انجام می‌شود. اگر برای خرید انتخاب شوید، در همین برنامه یک شماره دریافت خواهید کرد. اگر با دریافت پیامک موافقت کرده باشید، از طریق پیامک نیز به شما اطلاع داده می‌شود.',
			},
			registrationClosedState: {
				heading: 'ثبت‌نام بسته است',
				description: 'برای کمک با یکی از اعضای تیم بازار صحبت کنید.',
			},
			serviceState: {
				inProgressHeading: 'بازار امروز در حال برگزاری است',
				inProgressDescription:
					'ثبت‌نام برای امروز بسته شده است. اگر هنوز ثبت‌نام نکرده‌اید، لطفاً با یکی از اعضای تیم بازار صحبت کنید.',
				endedHeading: 'بازار امروز به پایان رسید',
				endedDescription:
					'از اینکه بخشی از جامعه ما هستید سپاسگزاریم. برای بازار بعدی، برنامه بالا را بررسی کنید.',
			},
		},
		admin: 'مدیریت',
		adminDescription: 'ابزارهای مدیریت صف به‌زودی در دسترس خواهند بود.',
		adminEyebrow: 'تیم بازار',
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
		cancelVisit: 'لغو این بازدید',
		cancelVisitConfirm: 'جای خود را در صف این بازدید لغو می‌کنید؟',
		childrenCount: 'تعداد کودکانی که برای آن‌ها خرید می‌کنید',
		compassionFood: 'غذای دلسوزانه',
		countBackLabel: 'انتخاب عدد کوچک‌تر',
		countOtherLabel: 'یا عدد دیگری وارد کنید',
		countOtherPlaceholder: 'مقدار را وارد کنید',
		currentStatus: 'وضعیت فعلی',
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
		firstName: 'نام',
		formDescription: 'چند اطلاعات به ما کمک می‌کند تا برای بازدید شما آماده شویم.',
		formTitle: 'درباره خودتان بگویید',
		guest: 'مهمان',
		heroCopy: 'با هم شکوفا می‌شویم. در پایین ثبت‌نام کنید و تیم ما بقیه کارها را انجام می‌دهد.',
		household: 'تعداد افراد خانواده شما',
		householdHint: 'خودتان را هم حساب کنید',
		lastName: 'نام خانوادگی',
		language: 'زبان',
		languagePrompt: 'زبان خود را انتخاب کنید',
		marketName: 'The Bay Compassion',
		notificationCalledBody: 'لطفاً اکنون برای دریافت خدمات مراجعه کنید.',
		notificationCalledTitle: 'نوبت شماست',
		notificationNotSelectedBody: 'شما برای خدمات امروز انتخاب نشدید.',
		notificationNotSelectedTitle: 'نتیجه قرعه‌کشی',
		notificationRegisteredBody: 'ثبت‌نام شما تأیید شد.',
		notificationRegisteredTitle: 'ثبت‌نام تأیید شد',
		notificationRegistrationClosedBody: 'ثبت‌نام بسته شد. قرعه‌کشی به‌زودی آغاز می‌شود.',
		notificationRegistrationClosedTitle: 'ثبت‌نام بسته شد',
		notificationSelectedBody: 'شما انتخاب شدید. لطفاً تا زمان فراخوان منتظر بمانید.',
		notificationSelectedTitle: 'شما انتخاب شدید',
		notificationsEnable: 'درباره این مراجعه به من اطلاع دهید',
		notificationsDenied: 'اعلان‌ها مسدود هستند. آن‌ها را در تنظیمات دستگاه فعال کنید.',
		notificationsEnabled: 'اعلان‌ها برای این مراجعه فعال شدند.',
		notificationsError: 'نتوانستیم اعلان‌ها را فعال کنیم. لطفاً دوباره تلاش کنید.',
		notificationsIosInstall:
			'در آیفون یا آیپد، پیش از فعال کردن اعلان‌ها این برنامه را به صفحه اصلی اضافه کنید.',
		notificationsUnsupported: 'اعلان‌های فوری در این دستگاه در دسترس نیستند.',
		smsConsentLabel:
			'موافقم پیامک‌هایی از The Bay Compassion درباره جایگاهم در صف و وضعیت این مراجعه دریافت کنم. تعداد پیام‌ها متغیر است و معمولاً از چند پیام در هر روز بازار بیشتر نمی‌شود. ممکن است هزینه پیامک و داده اعمال شود. برای لغو اشتراک STOP و برای راهنمایی HELP را پاسخ دهید. رضایت به دریافت پیامک برای دریافت خدمات بازار مواد غذایی الزامی نیست.',
		smsEnable: 'فعال‌کردن به‌روزرسانی‌های پیامکی',
		smsEnabled: 'به‌روزرسانی‌های پیامکی برای این مراجعه و مراجعه‌های آینده فعال شدند.',
		smsError: 'نتوانستیم به‌روزرسانی‌های پیامکی را فعال کنیم. لطفاً دوباره تلاش کنید.',
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
		signedInAs: 'واردشده به‌عنوان',
		signOut: 'خروج',
		submissionError: 'ثبت‌نام شما ذخیره نشد. لطفاً دوباره تلاش کنید.',
		submit: 'پیوستن به صف',
		submitting: 'در حال پیوستن به صف…',
		termsAndConditions: 'شرایط و ضوابط',
		successDescription: 'وقتی نوبت شما شد اطلاع می‌دهیم. از حضورتان سپاسگزاریم.',
		successTitle: 'شما در صف هستید!',
		queuePositionLabel: 'جایگاه شما در صف',
		guestsAheadOfYou: 'مهمانان جلوتر از شما',
		youAreNext: 'شما نفر بعدی هستید',
		calledTitle: 'نوبت شماست',
		calledDescription: 'لطفاً همین حالا به میز مراجعه کنید.',
		statusCancelled: 'لغوشده',
		statusCalled: 'فراخوانده‌شده',
		statusLoading: 'در حال بررسی وضعیت بازار امروز…',
		statusNoShow: 'غایب',
		statusNotPlaced: 'انتخاب‌نشده',
		statusRegistered: 'ثبت‌شده',
		statusServed: 'خدمت‌رسانی‌شده',
		statusWaiting: 'در انتظار',
		visitError: 'این بازدید به‌روزرسانی نشد. از یکی از اعضای تیم بازار کمک بخواهید.',
		welcome: 'به بازار غذای جامعه خوش آمدید',
	},
	tl: {
		guestView: {
			identityIndicator: {
				closeNotificationsDialog: 'Isara ang mga update sa abiso',
				heading: 'Nakilala sa device na ito',
				notificationsAction: 'Abisuhan Ako Tungkol sa mga Update',
				notificationsDialogTitle: 'Mga Update sa Abiso',
				notificationsEnabled: 'Naka-enable ang mga Abiso',
				notificationsError:
					'Hindi namin makuha ang status ng iyong mga abiso. Pakisubukang muli mamaya.',
				notificationsLoading: 'Sinusuri ang status ng mga abiso…',
				saveInformationAction: 'I-save ang aking impormasyon',
				unidentifiedHeading: 'I-save ang iyong impormasyon para sa susunod',
				unidentifiedMessage:
					'I-save ang iyong pangalan at numero ng telepono para hindi mo na kailangang ilagay muli ang mga ito sa susunod mong pagbisita. Hindi ka nito isinasali sa lottery.',
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
					'Magbubukas muli ang pagpaparehistro sa susunod na Sabado nang 10:30 AM at mananatiling bukas hanggang 11:30 AM.',
				lotteryDescription:
					'Dahil limitado ang mga supply, gumagamit ang pamilihan ng sistema ng lottery upang random na pumili ng mga mamimili bawat linggo. Maaari kang magparehistro sa lottery anumang oras sa loob ng isang oras na pagitan ng 10:30 AM at 11:30 AM tuwing Sabado. Hindi naaapektuhan ng maagang pagpaparehistro ang iyong pagkakataong mapili, kaya hindi kailangang magparehistro nang maaga.',
				selectionDescription:
					'Gaganapin ang lottery nang 11:30 AM. Kung mapipili kang mamili, bibigyan ka ng numero dito sa app. Kung pumayag kang tumanggap ng mga text message, aabisuhan ka rin sa pamamagitan ng text message.',
			},
			registrationClosedState: {
				heading: 'Sarado ang pagpaparehistro',
				description: 'Humingi ng tulong sa isang miyembro ng pangkat ng pamilihan.',
			},
			serviceState: {
				inProgressHeading: 'Kasalukuyang nagaganap ang pamilihan ngayon',
				inProgressDescription:
					'Sarado na ang pagpaparehistro para ngayong araw. Kung hindi ka pa nag-check in, makipag-usap sa isang miyembro ng pangkat ng pamilihan.',
				endedHeading: 'Natapos na ang pamilihan ngayong araw',
				endedDescription:
					'Salamat sa pagiging bahagi ng aming komunidad. Tingnan ang iskedyul sa itaas para sa susunod na pamilihan.',
			},
		},
		admin: 'Admin',
		adminDescription: 'Darating na ang mga kasangkapan sa pamamahala ng pila.',
		adminEyebrow: 'Pangkat ng pamilihan',
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
		cancelVisit: 'Kanselahin ang pagbisitang ito',
		cancelVisitConfirm: 'Kanselahin ang iyong puwesto sa pila para sa pagbisitang ito?',
		childrenCount: 'Bilang ng mga batang binibilhan mo',
		compassionFood: 'Pagkaing May Malasakit',
		countBackLabel: 'Pumili ng mas maliit na numero',
		countOtherLabel: 'O maglagay ng ibang numero',
		countOtherPlaceholder: 'Ilagay ang halaga',
		currentStatus: 'Kasalukuyang katayuan',
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
		firstName: 'Pangalan',
		formDescription: 'Makakatulong ang ilang detalye upang maihanda namin ang inyong pagbisita.',
		formTitle: 'Sabihin sa amin ang tungkol sa iyo',
		guest: 'Bisita',
		heroCopy:
			'Sama-sama tayong uunlad. Mag-check in sa ibaba at ang aming pangkat na ang bahala sa iba.',
		household: 'Bilang ng mga tao sa inyong sambahayan',
		householdHint: 'Isama ang sarili',
		lastName: 'Apelyido',
		language: 'Wika',
		languagePrompt: 'Piliin ang iyong wika',
		marketName: 'The Bay Compassion',
		notificationCalledBody: 'Mangyaring lumapit na para sa serbisyo.',
		notificationCalledTitle: 'Oras mo na',
		notificationNotSelectedBody: 'Hindi ka napili para sa serbisyo ngayong araw.',
		notificationNotSelectedTitle: 'Resulta ng lottery',
		notificationRegisteredBody: 'Kumpirmado na ang iyong pagpaparehistro.',
		notificationRegisteredTitle: 'Kumpirmado ang pagpaparehistro',
		notificationRegistrationClosedBody:
			'Sarado na ang pagpaparehistro. Magsisimula na ang lottery.',
		notificationRegistrationClosedTitle: 'Sarado na ang pagpaparehistro',
		notificationSelectedBody: 'Napili ka. Mangyaring maghintay hanggang tawagin ka.',
		notificationSelectedTitle: 'Napili ka',
		notificationsEnable: 'Abisuhan ako tungkol sa pagbisitang ito',
		notificationsDenied: 'Naka-block ang mga abiso. I-enable ang mga ito sa settings ng device.',
		notificationsEnabled: 'Naka-enable ang mga abiso para sa pagbisitang ito.',
		notificationsError: 'Hindi namin ma-enable ang mga abiso. Pakisubukang muli.',
		notificationsIosInstall:
			'Sa iPhone o iPad, idagdag muna ang app na ito sa Home Screen bago i-enable ang mga abiso.',
		notificationsUnsupported: 'Hindi available ang mga push notification sa device na ito.',
		smsConsentLabel:
			'Sumasang-ayon akong tumanggap ng mga text message mula sa The Bay Compassion tungkol sa puwesto ko sa pila at katayuan ng pagbisitang ito. Nag-iiba ang dalas at karaniwang hindi hihigit sa ilang mensahe bawat araw ng pamilihan. Maaaring may mga bayad sa mensahe at data. Mag-reply ng STOP para mag-unsubscribe o HELP para sa tulong. Hindi kailangang pumayag upang makatanggap ng serbisyo sa pamilihan ng pagkain.',
		smsEnable: 'I-enable ang mga text update',
		smsEnabled:
			'Naka-enable ang mga text message update para sa pagbisitang ito at mga susunod na pagbisita.',
		smsError: 'Hindi namin ma-enable ang mga text update. Pakisubukang muli.',
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
		signedInAs: 'Naka-sign in bilang',
		signOut: 'Mag-sign out',
		submissionError: 'Hindi namin na-save ang inyong check-in. Pakisubukang muli.',
		submit: 'Sumali sa pila',
		submitting: 'Sumasali sa pila…',
		termsAndConditions: 'Mga Tuntunin at Kundisyon',
		successDescription: 'Ipaaalam namin kapag oras na ninyo. Salamat sa pagpunta.',
		successTitle: 'Nasa pila na kayo!',
		queuePositionLabel: 'Ang inyong puwesto sa pila',
		guestsAheadOfYou: 'Mga bisita bago kayo',
		youAreNext: 'Kayo na ang susunod',
		calledTitle: 'Kayo na po ang susunod',
		calledDescription: 'Pumunta na po kayo sa mesa ngayon.',
		statusCancelled: 'Kinansela',
		statusCalled: 'Tinawag',
		statusLoading: 'Sinusuri ang katayuan ng palengke ngayon…',
		statusNoShow: 'Hindi dumating',
		statusNotPlaced: 'Hindi napili',
		statusRegistered: 'Nakarehistro',
		statusServed: 'Napagsilbihan',
		statusWaiting: 'Naghihintay',
		visitError: 'Hindi namin ma-update ang pagbisitang ito. Humingi ng tulong sa pangkat.',
		welcome: 'Maligayang pagdating sa pamilihan ng pagkaing pangkomunidad',
	},
	vi: {
		guestView: {
			identityIndicator: {
				closeNotificationsDialog: 'Đóng cập nhật thông báo',
				heading: 'Đã nhận dạng trên thiết bị này',
				notificationsAction: 'Thông báo cho tôi về cập nhật',
				notificationsDialogTitle: 'Cập nhật thông báo',
				notificationsEnabled: 'Đã bật thông báo',
				notificationsError: 'Không thể tải trạng thái thông báo của bạn. Vui lòng thử lại sau.',
				notificationsLoading: 'Đang kiểm tra trạng thái thông báo…',
				saveInformationAction: 'Lưu thông tin của tôi',
				unidentifiedHeading: 'Lưu thông tin cho lần sau',
				unidentifiedMessage:
					'Lưu tên và số điện thoại để bạn không phải nhập lại trong lần ghé tiếp theo. Việc này không đưa bạn vào danh sách xổ số.',
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
				subheading: 'Đăng ký sẽ mở lại vào 10:30 sáng thứ Bảy tới và kéo dài đến 11:30 sáng.',
				lotteryDescription:
					'Do nguồn cung có hạn, chợ sử dụng hệ thống xổ số để chọn ngẫu nhiên người mua sắm mỗi tuần. Bạn có thể đăng ký tham gia xổ số vào bất kỳ lúc nào trong khung thời gian một giờ từ 10:30 đến 11:30 sáng thứ Bảy. Đăng ký sớm không làm tăng cơ hội được chọn, vì vậy bạn không cần đăng ký sớm.',
				selectionDescription:
					'Xổ số sẽ diễn ra lúc 11:30 sáng. Nếu được chọn để mua sắm, bạn sẽ nhận được một số thứ tự ngay trong ứng dụng. Nếu đồng ý nhận tin nhắn văn bản, bạn cũng sẽ được thông báo qua tin nhắn.',
			},
			registrationClosedState: {
				heading: 'Đã đóng đăng ký',
				description: 'Vui lòng nhờ nhân viên chợ hỗ trợ.',
			},
			serviceState: {
				inProgressHeading: 'Phiên chợ hôm nay đang diễn ra',
				inProgressDescription:
					'Đăng ký đã đóng cho hôm nay. Nếu bạn chưa đăng ký, vui lòng trao đổi với nhân viên chợ.',
				endedHeading: 'Phiên chợ hôm nay đã kết thúc',
				endedDescription:
					'Cảm ơn bạn đã là một phần của cộng đồng chúng tôi. Xem lịch ở trên cho phiên chợ tiếp theo.',
			},
		},
		admin: 'Quản trị',
		adminDescription: 'Công cụ quản lý hàng đợi sẽ sớm có.',
		adminEyebrow: 'Đội ngũ chợ',
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
		cancelVisit: 'Hủy lượt ghé này',
		cancelVisitConfirm: 'Hủy vị trí của bạn trong hàng đợi cho lượt ghé này?',
		childrenCount: 'Số trẻ em bạn đang mua sắm cho',
		compassionFood: 'Thực Phẩm Nhân Ái',
		countBackLabel: 'Chọn số nhỏ hơn',
		countOtherLabel: 'Hoặc nhập số khác',
		countOtherPlaceholder: 'Nhập giá trị',
		currentStatus: 'Trạng thái hiện tại',
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
		firstName: 'Tên',
		formDescription: 'Một vài thông tin giúp chúng tôi chuẩn bị cho chuyến thăm của bạn.',
		formTitle: 'Hãy cho chúng tôi biết về bạn',
		guest: 'Khách',
		heroCopy:
			'Cùng nhau chúng ta phát triển. Hãy đăng ký bên dưới và đội ngũ của chúng tôi sẽ lo phần còn lại.',
		household: 'Số người trong hộ gia đình của bạn',
		householdHint: 'Bao gồm cả bạn',
		lastName: 'Họ',
		language: 'Ngôn ngữ',
		languagePrompt: 'Chọn ngôn ngữ của bạn',
		marketName: 'The Bay Compassion',
		notificationCalledBody: 'Vui lòng đến khu vực phục vụ ngay bây giờ.',
		notificationCalledTitle: 'Đến lượt bạn',
		notificationNotSelectedBody: 'Bạn không được chọn cho buổi phục vụ hôm nay.',
		notificationNotSelectedTitle: 'Kết quả xổ số',
		notificationRegisteredBody: 'Đăng ký của bạn đã được xác nhận.',
		notificationRegisteredTitle: 'Đã xác nhận đăng ký',
		notificationRegistrationClosedBody: 'Đăng ký đã đóng. Xổ số sẽ sớm bắt đầu.',
		notificationRegistrationClosedTitle: 'Đã đóng đăng ký',
		notificationSelectedBody: 'Bạn đã được chọn. Vui lòng chờ đến khi được gọi.',
		notificationSelectedTitle: 'Bạn đã được chọn',
		notificationsEnable: 'Thông báo cho tôi về lượt ghé này',
		notificationsDenied: 'Thông báo đang bị chặn. Hãy bật trong phần cài đặt thiết bị.',
		notificationsEnabled: 'Đã bật thông báo cho lượt ghé này.',
		notificationsError: 'Chúng tôi không thể bật thông báo. Vui lòng thử lại.',
		notificationsIosInstall:
			'Trên iPhone hoặc iPad, hãy thêm ứng dụng này vào Màn hình chính trước khi bật thông báo.',
		notificationsUnsupported: 'Thiết bị này không hỗ trợ thông báo đẩy.',
		smsConsentLabel:
			'Tôi đồng ý nhận tin nhắn từ The Bay Compassion về vị trí trong hàng đợi và trạng thái lượt ghé của tôi. Tần suất thay đổi, thường không quá vài tin nhắn trong mỗi ngày diễn ra chợ. Có thể áp dụng phí tin nhắn và dữ liệu. Trả lời STOP để hủy đăng ký hoặc HELP để được hỗ trợ. Không bắt buộc đồng ý để nhận dịch vụ tại chợ thực phẩm.',
		smsEnable: 'Bật cập nhật qua tin nhắn',
		smsEnabled: 'Thông báo qua tin nhắn văn bản đã được bật cho lượt ghé này và các lượt ghé sau.',
		smsError: 'Chúng tôi không thể bật thông báo qua tin nhắn văn bản. Vui lòng thử lại.',
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
		signedInAs: 'Đã đăng nhập với tên',
		signOut: 'Đăng xuất',
		submissionError: 'Chúng tôi không thể lưu đăng ký của bạn. Vui lòng thử lại.',
		submit: 'Vào hàng đợi',
		submitting: 'Đang vào hàng đợi…',
		termsAndConditions: 'Điều khoản và Điều kiện',
		successDescription: 'Chúng tôi sẽ báo cho bạn khi đến lượt. Cảm ơn bạn đã đến.',
		successTitle: 'Bạn đã vào hàng đợi!',
		queuePositionLabel: 'Vị trí của bạn trong hàng',
		guestsAheadOfYou: 'Số khách trước bạn',
		youAreNext: 'Bạn là người tiếp theo',
		calledTitle: 'Đã đến lượt bạn',
		calledDescription: 'Vui lòng đến quầy ngay bây giờ.',
		statusCancelled: 'Đã hủy',
		statusCalled: 'Đã gọi',
		statusLoading: 'Đang kiểm tra tình trạng chợ hôm nay…',
		statusNoShow: 'Không đến',
		statusNotPlaced: 'Không được chọn',
		statusRegistered: 'Đã đăng ký',
		statusServed: 'Đã phục vụ',
		statusWaiting: 'Đang chờ',
		visitError: 'Không thể cập nhật lượt ghé này. Vui lòng nhờ nhân viên chợ hỗ trợ.',
		welcome: 'Chào mừng đến với chợ thực phẩm cộng đồng',
	},
	zh: {
		guestView: {
			identityIndicator: {
				closeNotificationsDialog: '关闭通知更新',
				heading: '已在此设备上识别',
				notificationsAction: '有更新时通知我',
				notificationsDialogTitle: '通知更新',
				notificationsEnabled: '通知已启用',
				notificationsError: '无法获取您的通知状态。请稍后重试。',
				notificationsLoading: '正在检查通知状态…',
				saveInformationAction: '保存我的信息',
				unidentifiedHeading: '保存信息，方便下次使用',
				unidentifiedMessage:
					'保存您的姓名和电话号码，下次到访时就无需再次输入。这不会让您进入抽签。',
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
				subheading: '登记将于下周六上午 10:30 再次开放，并持续至上午 11:30。',
				lotteryDescription:
					'由于物资有限，市场每周通过抽签随机选出购物者。您可以在周六上午 10:30 至 11:30 的一小时窗口内随时登记参加抽签。提前登记不会增加被选中的机会，因此无需提早登记。',
				selectionDescription:
					'抽签将于上午 11:30 进行。如果您获选购物，应用中会显示您的号码。如果您同意接收短信，也会收到短信通知。',
			},
			registrationClosedState: {
				heading: '登记已关闭',
				description: '请向市场工作人员寻求帮助。',
			},
			serviceState: {
				inProgressHeading: '今天的市场正在进行中',
				inProgressDescription: '今天的登记已关闭。如果您还未登记，请联系市场工作人员。',
				endedHeading: '今天的市场已结束',
				endedDescription: '感谢您成为我们社区的一员。请查看上方的时间安排，了解下一次市场。',
			},
		},
		admin: '管理',
		adminDescription: '排队管理工具即将推出。',
		adminEyebrow: '市场团队',
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
		cancelVisit: '取消本次到访',
		cancelVisitConfirm: '要取消本次到访的排队位置吗？',
		childrenCount: '您为多少儿童采购',
		compassionFood: '关爱食品',
		countBackLabel: '选择较小的数字',
		countOtherLabel: '或输入其他数字',
		countOtherPlaceholder: '输入数值',
		currentStatus: '当前状态',
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
		firstName: '名字',
		formDescription: '一些基本信息能帮助我们为您的到访做好准备。',
		formTitle: '请告诉我们您的信息',
		guest: '访客',
		heroCopy: '我们一起蓬勃发展。在下方登记，剩下的交给我们的团队。',
		household: '您家庭中的人数',
		householdHint: '包括您自己',
		lastName: '姓氏',
		language: '语言',
		languagePrompt: '选择您的语言',
		marketName: 'The Bay Compassion',
		notificationCalledBody: '请现在前往服务区。',
		notificationCalledTitle: '轮到您了',
		notificationNotSelectedBody: '您未被选中参加今天的服务。',
		notificationNotSelectedTitle: '抽签结果',
		notificationRegisteredBody: '您的登记已确认。',
		notificationRegisteredTitle: '登记已确认',
		notificationRegistrationClosedBody: '登记已关闭。抽签即将开始。',
		notificationRegistrationClosedTitle: '登记已关闭',
		notificationSelectedBody: '您已被选中。请等待叫号。',
		notificationSelectedTitle: '您已被选中',
		notificationsEnable: '通知我此次到访的状态',
		notificationsDenied: '通知已被阻止。请在设备设置中启用。',
		notificationsEnabled: '已为此次到访启用通知。',
		notificationsError: '无法启用通知。请重试。',
		notificationsIosInstall: '在 iPhone 或 iPad 上，请先将此应用添加到主屏幕，然后再启用通知。',
		notificationsUnsupported: '此设备不支持推送通知。',
		smsConsentLabel:
			'我同意接收 The Bay Compassion 发送的有关排队位置和到访状态的短信。短信频率不定，通常每个市场开放日不超过数条。可能会产生短信和数据费用。回复 STOP 可取消订阅，回复 HELP 可获取帮助。是否同意接收短信不影响获得食品市场服务。',
		smsEnable: '启用短信更新',
		smsEnabled: '已为本次及今后的到访启用短信更新。',
		smsError: '我们无法启用短信更新。请重试。',
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
		signedInAs: '登录身份',
		signOut: '退出登录',
		submissionError: '无法保存您的登记信息。请重试。',
		submit: '加入队列',
		submitting: '正在加入队列…',
		termsAndConditions: '条款和条件',
		successDescription: '轮到您时我们会通知您。感谢您的到来。',
		successTitle: '您已加入队列！',
		queuePositionLabel: '您的排队位置',
		guestsAheadOfYou: '您前面的访客',
		youAreNext: '下一位就是您',
		calledTitle: '轮到您了',
		calledDescription: '请现在到服务台来。',
		statusCancelled: '已取消',
		statusCalled: '已叫号',
		statusLoading: '正在查询今天的市场状态…',
		statusNoShow: '未到场',
		statusNotPlaced: '未入选',
		statusRegistered: '已登记',
		statusServed: '已服务',
		statusWaiting: '等待中',
		visitError: '无法更新本次到访。请向市场工作人员寻求帮助。',
		welcome: '欢迎来到社区食品市场',
	},
	ar: {
		guestView: {
			identityIndicator: {
				closeNotificationsDialog: 'إغلاق تحديثات الإشعارات',
				heading: 'تم التعرّف عليك على هذا الجهاز',
				notificationsAction: 'أبلغني بالتحديثات',
				notificationsDialogTitle: 'تحديثات الإشعارات',
				notificationsEnabled: 'تم تفعيل الإشعارات',
				notificationsError: 'تعذر استرداد حالة إشعاراتك. يرجى المحاولة مرة أخرى لاحقًا.',
				notificationsLoading: 'جارٍ التحقق من حالة الإشعارات…',
				saveInformationAction: 'حفظ معلوماتي',
				unidentifiedHeading: 'احفظ معلوماتك للمرة القادمة',
				unidentifiedMessage:
					'احفظ اسمك ورقم هاتفك حتى لا تضطر إلى إدخالهما مرة أخرى في زيارتك القادمة. هذا لا يدخلك في القرعة.',
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
					'سيفتح التسجيل مجددًا يوم السبت المقبل الساعة 10:30 صباحًا ويستمر حتى الساعة 11:30 صباحًا.',
				lotteryDescription:
					'نظرًا لمحدودية الإمدادات، يستخدم السوق نظام القرعة لاختيار المتسوقين عشوائيًا كل أسبوع. يمكنك التسجيل في القرعة في أي وقت خلال فترة الساعة الواحدة من 10:30 إلى 11:30 صباحًا يوم السبت. لا يؤثر التسجيل المبكر في فرص اختيارك، لذلك لا حاجة إلى التسجيل مبكرًا.',
				selectionDescription:
					'ستُجرى القرعة الساعة 11:30 صباحًا. إذا تم اختيارك للتسوق، فسيظهر لك رقم هنا في التطبيق. وإذا وافقت على تلقي الرسائل النصية، فسيتم إخطارك أيضًا برسالة نصية.',
			},
			registrationClosedState: {
				heading: 'التسجيل مغلق',
				description: 'يرجى طلب المساعدة من أحد أعضاء فريق السوق.',
			},
			serviceState: {
				inProgressHeading: 'سوق اليوم جارٍ الآن',
				inProgressDescription:
					'أُغلق التسجيل لهذا اليوم. إذا لم تكن قد سجّلت الدخول بعد، يرجى التحدث مع أحد أعضاء فريق السوق.',
				endedHeading: 'انتهى سوق اليوم',
				endedDescription:
					'شكرًا لكونك جزءًا من مجتمعنا. يرجى مراجعة الجدول أعلاه لمعرفة موعد السوق القادم.',
			},
		},
		admin: 'الإدارة',
		adminDescription: 'أدوات إدارة قائمة الانتظار ستتوفر قريبًا.',
		adminEyebrow: 'فريق السوق',
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
		cancelVisit: 'إلغاء هذه الزيارة',
		cancelVisitConfirm: 'هل تريد إلغاء مكانك في قائمة انتظار هذه الزيارة؟',
		childrenCount: 'عدد الأطفال الذين تتسوق من أجلهم',
		compassionFood: 'طعام الرحمة',
		countBackLabel: 'اختيار رقم أصغر',
		countOtherLabel: 'أو أدخل رقمًا آخر',
		countOtherPlaceholder: 'أدخل القيمة',
		currentStatus: 'الحالة الحالية',
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
		firstName: 'الاسم الأول',
		formDescription: 'تساعدنا بعض التفاصيل على الاستعداد لزيارتك.',
		formTitle: 'أخبرنا عنك',
		guest: 'ضيف',
		heroCopy: 'معًا نزدهر. سجّل في الأسفل وسيتولى فريقنا بقية الأمور.',
		household: 'عدد الأشخاص في أسرتك',
		householdHint: 'بما في ذلك أنت',
		lastName: 'اسم العائلة',
		language: 'اللغة',
		languagePrompt: 'اختر لغتك',
		marketName: 'The Bay Compassion',
		notificationCalledBody: 'يرجى التوجه الآن لتلقي الخدمة.',
		notificationCalledTitle: 'حان دورك',
		notificationNotSelectedBody: 'لم يتم اختيارك لخدمة اليوم.',
		notificationNotSelectedTitle: 'نتيجة القرعة',
		notificationRegisteredBody: 'تم تأكيد تسجيلك.',
		notificationRegisteredTitle: 'تم تأكيد التسجيل',
		notificationRegistrationClosedBody: 'أُغلق التسجيل. ستبدأ القرعة قريبًا.',
		notificationRegistrationClosedTitle: 'أُغلق التسجيل',
		notificationSelectedBody: 'تم اختيارك. يرجى الانتظار حتى يتم استدعاؤك.',
		notificationSelectedTitle: 'تم اختيارك',
		notificationsEnable: 'أبلغني بمستجدات هذه الزيارة',
		notificationsDenied: 'الإشعارات محظورة. فعّلها من إعدادات جهازك.',
		notificationsEnabled: 'تم تفعيل الإشعارات لهذه الزيارة.',
		notificationsError: 'تعذر تفعيل الإشعارات. يرجى المحاولة مرة أخرى.',
		notificationsIosInstall:
			'على iPhone أو iPad، أضف هذا التطبيق إلى الشاشة الرئيسية قبل تفعيل الإشعارات.',
		notificationsUnsupported: 'الإشعارات الفورية غير متاحة على هذا الجهاز.',
		smsConsentLabel:
			'أوافق على تلقي رسائل نصية من The Bay Compassion بشأن مكاني في قائمة الانتظار وحالة زيارتي. يختلف عدد الرسائل، وعادةً لا يتجاوز بضع رسائل في كل يوم سوق. قد تُطبق رسوم الرسائل والبيانات. أرسل STOP لإلغاء الاشتراك أو HELP للمساعدة. الموافقة ليست شرطًا لتلقي خدمة سوق المواد الغذائية.',
		smsEnable: 'تفعيل التحديثات النصية',
		smsEnabled: 'تم تفعيل تحديثات الرسائل النصية لهذه الزيارة والزيارات القادمة.',
		smsError: 'تعذر تفعيل تحديثات الرسائل النصية. يرجى المحاولة مرة أخرى.',
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
		signedInAs: 'تم تسجيل الدخول باسم',
		signOut: 'تسجيل الخروج',
		submissionError: 'تعذر حفظ تسجيلك. يرجى المحاولة مرة أخرى.',
		submit: 'انضم إلى قائمة الانتظار',
		submitting: 'جارٍ الانضمام إلى قائمة الانتظار…',
		termsAndConditions: 'الشروط والأحكام',
		successDescription: 'سنخبرك عندما يحين دورك. شكرًا لوجودك معنا.',
		successTitle: 'أنت الآن في قائمة الانتظار!',
		queuePositionLabel: 'مكانك في الصف',
		guestsAheadOfYou: 'الضيوف الذين أمامك',
		youAreNext: 'أنت التالي',
		calledTitle: 'حان دورك',
		calledDescription: 'يرجى التوجه إلى الطاولة الآن.',
		statusCancelled: 'ملغاة',
		statusCalled: 'تم استدعاؤه',
		statusLoading: 'جارٍ التحقق من حالة السوق اليوم…',
		statusNoShow: 'لم يحضر',
		statusNotPlaced: 'لم يتم اختياره',
		statusRegistered: 'مسجل',
		statusServed: 'تمت خدمته',
		statusWaiting: 'قيد الانتظار',
		visitError: 'تعذر تحديث هذه الزيارة. يرجى طلب المساعدة من فريق السوق.',
		welcome: 'مرحبًا بكم في سوق الطعام المجتمعي',
	},
} as const satisfies Record<Locale, Translation>;
