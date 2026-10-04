/** One language's turn in a rotation. */
export type RotationSlot<Locale extends string> = { locale: Locale; durationMs: number };

/**
 * A repeating schedule of languages, each shown for its own length of time.
 *
 * Read against wall-clock time rather than counted from when a screen started, so every display
 * running the same schedule shows the same language at the same moment — two screens in one room
 * never disagree about which language is up.
 */
export class LanguageRotation<Locale extends string> {
	readonly cycleMs: number;

	constructor(private readonly slots: readonly RotationSlot<Locale>[]) {
		if (slots.length === 0 || slots.some(({ durationMs }) => !(durationMs > 0))) {
			throw new RangeError('A rotation needs at least one slot, each with a positive duration.');
		}
		this.cycleMs = slots.reduce((total, { durationMs }) => total + durationMs, 0);
	}

	/** One language, always. */
	static fixed<Locale extends string>(locale: Locale): LanguageRotation<Locale> {
		return new LanguageRotation([{ locale, durationMs: Number.MAX_SAFE_INTEGER }]);
	}

	/** Every language in turn, each for `durationMs`. */
	static evenly<Locale extends string>(
		locales: readonly Locale[],
		durationMs: number,
	): LanguageRotation<Locale> {
		return new LanguageRotation(locales.map((locale) => ({ locale, durationMs })));
	}

	/** The languages in the order they take their turns. */
	get locales(): Locale[] {
		return this.slots.map(({ locale }) => locale);
	}

	/** The language showing at `timeMs` (epoch milliseconds). */
	localeAt(timeMs: number): Locale {
		return this.slotAt(timeMs).slot.locale;
	}

	/** How long from `timeMs` until the language changes. Always positive. */
	msUntilNextChange(timeMs: number): number {
		return this.slotAt(timeMs).remainingMs;
	}

	private slotAt(timeMs: number): { slot: RotationSlot<Locale>; remainingMs: number } {
		let offset = ((timeMs % this.cycleMs) + this.cycleMs) % this.cycleMs;

		for (const slot of this.slots) {
			if (offset < slot.durationMs) {
				return { slot, remainingMs: slot.durationMs - offset };
			}
			offset -= slot.durationMs;
		}

		// Unreachable: `offset` is below the cycle, which is the sum of every slot.
		return { slot: this.slots[0]!, remainingMs: this.slots[0]!.durationMs };
	}
}
