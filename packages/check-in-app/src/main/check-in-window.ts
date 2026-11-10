import { app, BaseWindow } from 'electron';

import type { PrintStation } from './print-station.ts';
import type { QueueDesk } from './queue-desk.ts';
import type { Settings } from './settings.ts';

/** The print station's panel, beside the queue desk. The station's page is laid out for a phone. */
const panelWidth = 360;
/** The line between the two, which is the window's own background showing through. */
const divider = 1;

/**
 * The app's one window: the queue desk, with the print station's panel down its right side showing
 * the station's status and the tags it printed. The panel can be folded away, and is while the
 * station waits at the sign-in page; folded or not, the station keeps running.
 *
 * Closing the window only hides it, so the station keeps printing until the app is quit.
 */
export class CheckInWindow {
	private readonly window: BaseWindow;
	private readonly queueDesk: QueueDesk;
	private readonly printStation: PrintStation;
	private panelWanted = true;
	private quitting = false;

	constructor(settings: Settings, queueDesk: QueueDesk, printStation: PrintStation) {
		this.queueDesk = queueDesk;
		this.printStation = printStation;
		this.window = new BaseWindow({
			title: settings.name,
			width: 1440,
			height: 860,
			minWidth: 960,
			minHeight: 600,
			backgroundColor: '#d5dcde',
		});
		this.window.contentView.addChildView(queueDesk.view);
		this.window.contentView.addChildView(printStation.view);
		this.window.on('resize', () => this.layout());
		this.window.on('close', (event) => {
			if (!this.quitting) {
				event.preventDefault();
				this.window.hide();
			}
		});
		app.on('before-quit', () => (this.quitting = true));
		this.layout();
	}

	/** The window itself, which dialogs about it attach to. */
	get baseWindow(): BaseWindow {
		return this.window;
	}

	/** Whether the panel is open: wanted, and the station is past the sign-in page. */
	get isPanelOpen(): boolean {
		return this.panelWanted && this.printStation.isOnStationPage;
	}

	/** Brings the window forward. */
	show(): void {
		if (this.window.isMinimized()) {
			this.window.restore();
		}

		this.window.show();
		this.window.focus();
	}

	/** Shows or folds away the print station's panel. */
	setPanelWanted(wanted: boolean): void {
		this.panelWanted = wanted;
		this.layout();
	}

	/** Places the two views; call whenever the window's size or the panel's state changes. */
	layout(): void {
		const { width, height } = this.window.getContentBounds();
		const panel = this.isPanelOpen ? panelWidth : 0;
		const deskWidth = panel ? width - panel - divider : width;

		this.queueDesk.view.setBounds({ x: 0, y: 0, width: deskWidth, height });
		this.printStation.view.setBounds({ x: width - panel, y: 0, width: panel, height });
		this.printStation.view.setVisible(panel > 0);
	}
}
