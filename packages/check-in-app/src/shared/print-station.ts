/** The IPC between the print station's page and the main process. */
export const printStationChannels = {
	/** invoke(`LabelSize`) → void: prints the page as it stands, silently, on one label. */
	print: 'print-station:print',
} as const;

/** The label the page is laid out for, from `NameTag.label` in the web app. */
export type LabelSize = { widthMm: number; heightMm: number };

/**
 * What the preload puts on the page's `window` as `checkInApp`. The web app's
 * `src/components/print-station/check-in-app.ts` declares the same shape; keep the two in step.
 */
export type CheckInAppBridge = {
	printer: { print(label: LabelSize): Promise<void> };
};
