/**
 * Stands in for `src/auth.ts` on the guest phone, which signs nobody in. The real module builds a
 * URL from the page's origin as it loads, and a presentation opened from a file has none.
 */
export const authReturnUrl = '/';
