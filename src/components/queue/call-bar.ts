/**
 * How tall the phone's call bar is, without the safe area under it: the 52px button and 12px above
 * and below. The ticket sheet docks on top of it, so the call button stays in reach.
 */
export const callBarHeight = 76;

/** The call bar's height on a device, safe area included, as a CSS length. */
export const callBarOffset = `calc(${callBarHeight}px + env(safe-area-inset-bottom))`;
