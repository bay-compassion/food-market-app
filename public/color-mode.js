/*
 * Sets the colour scheme before the first paint, so a guest who chose dark (or whose device is
 * dark) never sees a flash of the light page while the app loads. It mirrors what
 * `AppThemeProvider` does once React mounts: the choice stored under `color-mode`, else the device.
 * A plain file rather than an inline script, which the Content Security Policy is moving to block.
 */
(function () {
	var mode = null;

	try {
		mode = window.localStorage.getItem('color-mode');
	} catch {
		// Storage can be unavailable (a private window, blocked site data); follow the device.
	}

	var dark =
		mode === 'dark' ||
		(mode !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);

	document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');

	if (dark) {
		var meta = document.querySelector('meta[name="theme-color"]');

		if (meta) {
			meta.setAttribute('content', '#1e474d');
		}
	}
})();
