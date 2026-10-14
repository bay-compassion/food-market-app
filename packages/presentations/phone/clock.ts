/**
 * The guest phone's clock. The phone runs in a frame of its own, so faking that frame's `Date` and
 * timers sets the time on the phone alone: the registration countdown, the late-arrival warmth, and
 * the visit's refresh notice all read it, and their intervals fire as the guide moves it on — in
 * step with the timeline, however fast frame capture runs.
 *
 * Only `Date` and the timer functions are faked. React schedules its work through
 * `MessageChannel`, and promises through microtasks, so both still run as they would on a phone.
 */
import { type Clock, withGlobal } from '@sinonjs/fake-timers';

export class PhoneClock {
	private clock: Clock | null = null;

	/** Sets the clock to `now`, dropping every timer the previous phone left behind. */
	reset(now: number): void {
		this.clock?.uninstall?.();
		this.clock = withGlobal(window).install({
			now,
			toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
		});
	}

	/** Moves the clock on to `now`, firing every timer due on the way. */
	advanceTo(now: number): void {
		if (!this.clock) {
			this.reset(now);

			return;
		}

		const ms = now - this.clock.now;

		if (ms > 0) {
			this.clock.tick(ms);
		}
	}

	/**
	 * Fires the timers due now, and any they schedule for now in turn — a closing sheet's
	 * zero-length transition, say. A tick runs every timer that falls due within it, including
	 * ones added while it runs.
	 */
	flush(): void {
		this.clock?.tick(0);
	}
}
