import { Alert } from '@mui/material';
import { reaction } from 'mobx';
import {
	SnackbarContent,
	SnackbarProvider,
	useSnackbar,
	type CustomContentProps,
	type VariantType,
} from 'notistack';
import { forwardRef, useEffect } from 'react';

import type { NotificationSeverity } from '../../stores/notification.store';
import { useRootStore } from '../../stores/react/store-context';

const severities: Record<VariantType, NotificationSeverity> = {
	default: 'info',
	info: 'info',
	success: 'success',
	warning: 'warning',
	error: 'error',
};

/**
 * One toast, drawn as the theme's filled `Alert` rather than notistack's own look, so it matches
 * every other alert in the app.
 *
 * The toast renders in a portal, outside `.app-shell`, so it takes the shell's writing direction
 * itself. `dir="auto"` on the message, as in `ConfirmationDrawer`, keeps an English admin message
 * readable for a worker whose saved language is right-to-left. Not an `observer()`: a toast is
 * gone in seconds, so the direction it was raised in is the one it keeps.
 */
const Toast = forwardRef<HTMLDivElement, CustomContentProps>(function Toast(
	{ message, variant },
	ref,
) {
	const { translations } = useRootStore();

	return (
		<SnackbarContent ref={ref}>
			<Alert
				severity={severities[variant]}
				variant="filled"
				dir={translations.dir}
				sx={{ width: '100%' }}
			>
				<span dir="auto">{message}</span>
			</Alert>
		</SnackbarContent>
	);
});

/** Hands each message `NotificationStore` holds to notistack, then takes it out of the store. */
function Notifier() {
	const { notifications } = useRootStore();
	const { enqueueSnackbar } = useSnackbar();

	useEffect(
		() =>
			reaction(
				() => notifications.pending.length,
				(count) => {
					if (count === 0) {
						return;
					}

					for (const { message, severity } of notifications.take()) {
						enqueueSnackbar(message, { variant: severity });
					}
				},
				// Anything raised before the shell mounted is shown straight away.
				{ fireImmediately: true },
			),
		[enqueueSnackbar, notifications],
	);

	return null;
}

/**
 * The app's toasts: brief messages about something that just happened, raised from anywhere
 * through `rootStore.notifications`.
 *
 * Mounted once per shell, like `ConfirmationDrawer`. Toasts are for transient outcomes — an
 * action that failed or finished — not for anything the person needs in order to fix a form;
 * those stay inline, next to the field.
 */
export function NotificationToasts() {
	return (
		<SnackbarProvider
			// Bottom-centre on a phone is where the thumb and the eye already are.
			anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
			autoHideDuration={6000}
			maxSnack={3}
			Components={{
				default: Toast,
				info: Toast,
				success: Toast,
				warning: Toast,
				error: Toast,
			}}
		>
			<Notifier />
		</SnackbarProvider>
	);
}
