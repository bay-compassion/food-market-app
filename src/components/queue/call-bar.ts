/**
 * How tall the phone's call bar is, without the safe area under it: the 52px button and 12px above
 * and below. The ticket sheet docks on top of it, so the call button stays in reach.
 */
export const callBarHeight = 76;

/*
 * Where the call bar docks. Standalone, it runs along the screen's bottom edge and pads itself clear
 * of the safe area. Inside the dashboard it sits on the tab bar instead, which has already taken the
 * safe area, so `QueueLine` resets both properties there. Undefined, they mean the bottom edge.
 */
const dockInset = 'var(--queue-dock-inset, 0px)';
const dockSafeArea = 'var(--queue-dock-safe-area, env(safe-area-inset-bottom))';

/** The space under the call bar's button: its padding, and the safe area when it is the bar's. */
export const callBarPaddingBottom = `calc(12px + ${dockSafeArea})`;

/** How far up the screen the call bar sits: the bottom edge, or the top of the tab bar. */
export const callBarBottom = dockInset;

/** The top of the call bar, measured from the bottom of the screen, as a CSS length. */
export const callBarOffset = `calc(${callBarHeight}px + ${dockSafeArea} + ${dockInset})`;
