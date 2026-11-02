import type { DrawRecord } from './draw-record.ts';

export const temperatureLevels = ['cold', 'cool', 'even', 'warm', 'hot', 'new'] as const;

export type TemperatureLevel = (typeof temperatureLevels)[number];

/**
 * How a person's luck in the draw compares with even odds. It describes access, not need, and only
 * draws count: lateness and no-shows never move it.
 *
 * The score is how many usual swings of luck separate the numbers they got from the numbers even
 * odds would have given, so a small history can't reach an extreme label as easily as a long one.
 * Some people land on Cold by chance alone, so it is no evidence the draw is unfair.
 */
export class GuestTemperature {
	private static readonly minimumDraws = 3;

	constructor(private readonly record: DrawRecord) {}

	get score(): number {
		const spread = Math.sqrt(this.record.variance);

		return spread === 0 ? 0 : (this.record.numbers - this.record.expectedNumbers) / spread;
	}

	get level(): TemperatureLevel {
		if (this.record.draws < GuestTemperature.minimumDraws) {
			return 'new';
		}

		const { score } = this;

		if (score <= -0.5) {
			return score <= -1.5 ? 'cold' : 'cool';
		}

		if (score < 0.5) {
			return 'even';
		}

		return score < 1.5 ? 'warm' : 'hot';
	}
}
