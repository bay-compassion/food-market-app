/**
 * The board's two columns in landscape — the number being called, then the "Already Called"
 * panel — shared with the header so the clock lines up with the panel's left edge.
 */
export const boardColumns = {
	template: '3fr 2fr',
	gap: '5vmin',
} as const;
