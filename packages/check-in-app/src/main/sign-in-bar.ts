import { WebContentsView } from 'electron';

/** The bar's height, above the queue desk. */
export const signInBarHeight = 48;

/**
 * The bar's buttons are links to this made-up host, which `will-navigate` catches and turns into
 * the action, so the bar needs no preload and no IPC. `.invalid` can never resolve (RFC 2606).
 */
const actionHost = 'check-in-app.invalid';

export type SignInBarActions = { back(): void; startOver(): void };

/**
 * A way out for a volunteer stranded off the app — on Auth0's pages, whose error page has no link
 * back, or on a page that failed to load. The window has no browser buttons, so this bar, shown
 * across the top of the queue desk only then, gives it two: Back, and Start Over, which opens the
 * queue desk afresh and so starts a new sign-in.
 *
 * A page of the app's own, not buttons put into Auth0's page, which would break whenever Auth0
 * changed its markup.
 */
export class SignInBar {
	readonly view: WebContentsView;
	private rendered: string | null = null;

	constructor(actions: SignInBarActions) {
		this.view = new WebContentsView({
			webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
		});
		this.view.setBackgroundColor('#275c63');
		this.view.webContents.on('will-navigate', (event) => {
			event.preventDefault();

			if (!URL.canParse(event.url)) {
				return;
			}

			const { host, pathname } = new URL(event.url);

			if (host !== actionHost) {
				return;
			}

			if (pathname === '/back') {
				actions.back();
			} else if (pathname === '/start-over') {
				actions.startOver();
			}
		});
	}

	/** Draws the bar for the desk's current state; cheap to call when nothing changed. */
	update({ canGoBack }: { canGoBack: boolean }): void {
		const html = page(canGoBack);

		if (html !== this.rendered) {
			this.rendered = html;
			void this.view.webContents.loadURL(
				`data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
			);
		}
	}
}

function page(canGoBack: boolean): string {
	const back = canGoBack
		? `<a class="button" href="https://${actionHost}/back">‹ Back</a>`
		: `<span class="button" aria-disabled="true">‹ Back</span>`;

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<style>
	html, body { margin: 0; height: 100%; }
	body {
		display: flex; align-items: center; gap: 12px; padding: 0 16px; box-sizing: border-box;
		background: #275c63; color: #fff; user-select: none; -webkit-user-select: none;
		font: 15px/1.3 -apple-system, BlinkMacSystemFont, sans-serif;
	}
	p { flex: 1; margin: 0; }
	.button {
		padding: 6px 14px; border-radius: 8px; background: #fff; color: #1e474d;
		font-weight: 600; text-decoration: none; cursor: default;
	}
	.button[aria-disabled] { opacity: 0.45; }
	.primary { background: #7ebdc5; color: #1e474d; }
</style>
</head>
<body>
	${back}
	<p>Stuck on an error? Start over to open the queue desk again.</p>
	<a class="button primary" href="https://${actionHost}/start-over">Start Over</a>
</body>
</html>`;
}
