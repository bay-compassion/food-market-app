/** Full screen for the HTML presentation, including controls. iPhones can use the page fallback. */
class PresentationFullscreen {
	private fallback = false;
	private restoreFrame: (() => void) | null = null;

	private readonly changed: () => void;

	constructor(changed: () => void) {
		this.changed = changed;

		document.addEventListener('fullscreenchange', () => this.sync());
		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape' && this.fallback) {
				event.preventDefault();
				this.exitFallback();
			}
		});
		window.addEventListener('resize', () => this.fit());
		new ResizeObserver(() => this.fit()).observe(document.getElementById('controls')!);
	}

	get active(): boolean {
		return !!document.fullscreenElement || this.fallback;
	}

	async toggle(): Promise<void> {
		if (document.fullscreenElement) {
			await document.exitFullscreen();
		} else if (this.fallback) {
			this.exitFallback();
		} else {
			if (document.fullscreenEnabled) {
				try {
					await document.documentElement.requestFullscreen();

					return;
				} catch {
					// Embedded browsers may advertise the API but reject the request.
				}
			}
			// Expand the same-origin published embed without reloading or losing playback position.
			const frame = window.frameElement as HTMLIFrameElement | null;

			if (frame) {
				const style = frame.style.cssText;
				const root = frame.ownerDocument.documentElement;
				const overflow = root.style.overflow;

				frame.style.cssText =
					'position:fixed;inset:0;width:100%;height:100%;border:0;border-radius:0;z-index:2147483647';
				root.style.overflow = 'hidden';

				this.restoreFrame = () => {
					frame.style.cssText = style;
					root.style.overflow = overflow;
				};
			}
			this.fallback = true;
			this.sync();
		}
	}

	private exitFallback(): void {
		this.fallback = false;
		this.restoreFrame?.();
		this.restoreFrame = null;
		this.sync();
		document.getElementById('fullscreen')!.focus();
	}

	private sync(): void {
		document.documentElement.classList.toggle('presentation-fullscreen', this.active);
		this.fit();
		this.changed();
	}

	private fit(): void {
		if (!this.active) {
			return;
		}
		const viewport = document.getElementById('viewport')!;
		const controls = document.getElementById('controls')!;
		const body = getComputedStyle(document.body);
		const [width, height] = getComputedStyle(viewport).aspectRatio.split('/').map(Number);
		const available =
			innerHeight -
			controls.offsetHeight -
			parseFloat(body.rowGap) -
			parseFloat(body.paddingTop) -
			parseFloat(body.paddingBottom);

		viewport.style.setProperty(
			'--fullscreen-width',
			Math.max(0, available) * (width! / height!) + 'px',
		);
	}
}

declare global {
	interface Window {
		PresentationFullscreen: typeof PresentationFullscreen;
	}
}

export type { PresentationFullscreen };

window.PresentationFullscreen = PresentationFullscreen;
