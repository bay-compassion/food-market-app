import { ipcMain, type IpcMainInvokeEvent, powerSaveBlocker, WebContentsView } from 'electron';

import { type LabelSize, printStationChannels } from '../shared/print-station.ts';
import type { Settings } from './settings.ts';
import { windowPreferences } from './window-preferences.ts';

/**
 * The print station, `/printing-station`, as the panel beside the queue desk. It shares the queue
 * desk's session, so the queue desk's sign-in covers it, and it prints each tag silently, with no
 * print dialog and no `--kiosk-printing` profile.
 *
 * A folded panel, or a window out of sight, would normally be slowed down, and macOS's App Nap would
 * slow the whole app; the station's two-second collection has to keep going regardless.
 */
export class PrintStation {
	readonly view: WebContentsView;
	private readonly settings: Settings;
	private onSite = false;

	/** `onChange` runs whenever the station arrives at, or leaves, its own page. */
	constructor(settings: Settings, onChange: () => void) {
		this.settings = settings;
		this.view = new WebContentsView({
			webPreferences: { ...windowPreferences(), backgroundThrottling: false },
		});
		this.view.webContents.on('did-navigate', (_event, url) => {
			this.onSite = new URL(url).origin === settings.site;
			onChange();
		});
	}

	/** Starts the station, and answers its page's requests to print. Once per app. */
	start(): void {
		ipcMain.handle(printStationChannels.print, (event, label: unknown) => this.print(event, label));
		powerSaveBlocker.start('prevent-app-suspension');
		void this.view.webContents.loadURL(this.settings.printStation);
	}

	/**
	 * Whether the station is on its own page, rather than waiting at the sign-in page, which it
	 * reaches when nobody has signed in yet. The panel stays folded while it waits.
	 */
	get isOnStationPage(): boolean {
		return this.onSite;
	}

	/**
	 * Tries again after a sign-in: once the queue desk has signed in, the session the two share lets
	 * the station in.
	 */
	afterSignIn(): void {
		if (!this.onSite) {
			void this.view.webContents.loadURL(this.settings.printStation);
		}
	}

	private print(event: IpcMainInvokeEvent, label: unknown): Promise<void> {
		const { webContents } = this.view;

		if (event.sender !== webContents) {
			return Promise.reject(new Error('Only the print station prints'));
		}

		if (!isLabelSize(label)) {
			return Promise.reject(new Error('Not a label size'));
		}

		return new Promise((resolve, reject) => {
			webContents.print(
				{
					silent: true,
					printBackground: true,
					deviceName: this.settings.printer ?? undefined,
					margins: { marginType: 'none' },
					// In microns. The page's own `@page` rule asks for the same size.
					pageSize: { width: label.widthMm * 1000, height: label.heightMm * 1000 },
				},
				(success, failureReason) =>
					success ? resolve() : reject(new Error(`Printing failed: ${failureReason}`)),
			);
		});
	}
}

/** A label between 1 and 30 cm on each side: anything else is not a label this app prints. */
function isLabelSize(value: unknown): value is LabelSize {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const { widthMm, heightMm } = value as Record<string, unknown>;

	return [widthMm, heightMm].every(
		(size) => typeof size === 'number' && Number.isFinite(size) && size >= 10 && size <= 300,
	);
}
