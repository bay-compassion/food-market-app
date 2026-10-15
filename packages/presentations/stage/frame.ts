/**
 * An app running in a frame of its own on a page (the guest phone, the admin dashboard), as the
 * frame exposes it to the page's script. `Scene` is everything one moment asks it to show.
 *
 * Types only, and free of GSAP's, so the frame apps' own projects can import it as well as pages.
 */
export interface FrameHandle<Scene> {
	/** Resolves once the frame has started and its fonts have loaded. */
	ready: Promise<void>;
	/**
	 * Shows a scene. `continuous` is true while the timeline plays forward on its own; a seek, or
	 * anything else that jumps, starts the frame over from the scene.
	 */
	show(scene: Scene, continuous: boolean): void;
	/** Resolves once the frame shows the last scene it was given, fully drawn. */
	settle(): Promise<void>;
	/** Requests the frame made that the page had no answer for; `verify.ts` expects none. */
	unanswered(): string[];
	/** Marks the page's script named that the screen did not show; `verify.ts` expects none. */
	missing?(): string[];
}
