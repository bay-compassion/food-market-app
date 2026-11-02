import type {
	StewardDraw,
	StewardLedgerResponse,
	StewardPerson,
	StewardTier,
} from '../services/steward-api.ts';
import { AutomaticOddsRule } from './automatic-odds-rule.ts';
import { DrawRecord } from './draw-record.ts';
import { GuestTemperature, temperatureLevels, type TemperatureLevel } from './guest-temperature.ts';

export type WeekMark = 'won' | 'missed' | 'none';

/** One person as the steward screens read them: their saved facts, and what follows from them. */
export class RosterPerson {
	readonly record: DrawRecord;

	constructor(
		readonly person: StewardPerson,
		private readonly draws: readonly StewardDraw[],
	) {
		this.record = new DrawRecord(person.outcomes);
	}

	get id(): string {
		return this.person.id;
	}

	get name(): string {
		return this.person.name;
	}

	get weight(): number {
		return this.person.weight;
	}

	get temperature(): TemperatureLevel {
		return new GuestTemperature(this.record).level;
	}

	/** The worst first. A person with too few draws to say sorts after everyone else. */
	get temperatureRank(): number {
		return temperatureLevels.indexOf(this.temperature);
	}

	/** When they last got a number; null if they never have in the record's window. */
	get lastNumberAt(): string | null {
		const won = this.person.outcomes.filter((outcome) => outcome.won).at(-1);

		return this.draws.find((draw) => draw.id === won?.drawId)?.opensAt ?? null;
	}

	get weeks(): WeekMark[] {
		return this.draws.map((draw) => {
			const outcome = this.person.outcomes.find(({ drawId }) => drawId === draw.id);

			if (!outcome) {
				return 'none';
			}

			return outcome.won ? 'won' : 'missed';
		});
	}

	get suggestedWeight(): number {
		return new AutomaticOddsRule().weightFor(this.record.missedInARow);
	}
}

export type StreakBand = { label: string; people: number; expected: number };
export type FrequencyBand = { label: string; people: number; missedShare: number };
export type TemperatureMisses = { level: TemperatureLevel; missed: number; entries: number };

/** Everything the steward screens derive from a ledger. */
export class StewardRoster {
	readonly people: RosterPerson[];

	constructor(readonly ledger: StewardLedgerResponse) {
		this.people = ledger.people.map((person) => new RosterPerson(person, ledger.draws));
	}

	get lastDraw(): StewardDraw | null {
		return this.ledger.draws.at(-1) ?? null;
	}

	get entered(): RosterPerson[] {
		return this.people.filter(({ record }) => record.draws > 0);
	}

	person(id: string | null): RosterPerson | null {
		return this.people.find((person) => person.id === id) ?? null;
	}

	/** Everyone who hasn't gone through a draw yet shows as New, the same as too few draws. */
	get temperatureCounts(): Record<TemperatureLevel, number> {
		const counts = Object.fromEntries(temperatureLevels.map((level) => [level, 0])) as Record<
			TemperatureLevel,
			number
		>;

		for (const person of this.people) {
			counts[person.temperature] += 1;
		}

		return counts;
	}

	get upcomingTemperatureCounts(): Record<TemperatureLevel, number> {
		const entrants = new Set(this.ledger.upcoming?.entrants ?? []);
		const counts = Object.fromEntries(temperatureLevels.map((level) => [level, 0])) as Record<
			TemperatureLevel,
			number
		>;

		for (const person of this.people) {
			if (entrants.has(person.id)) {
				counts[person.temperature] += 1;
			}
		}

		return counts;
	}

	get raisedEntrants(): RosterPerson[] {
		const entrants = new Set(this.ledger.upcoming?.entrants ?? []);

		return this.people.filter((person) => entrants.has(person.id) && person.weight > 1);
	}

	/** Today's streaks beside what even odds alone would produce, from each person's own draws. */
	get streakBands(): StreakBand[] {
		const top = 5;
		const people = Array.from({ length: top + 1 }, () => 0);
		const expected = Array.from({ length: top + 1 }, () => 0);

		for (const { record } of this.entered) {
			people[Math.min(record.missedInARow, top)]! += 1;

			let missedSoFar = 1;
			const newestFirst = [...record.outcomes].reverse();

			newestFirst.forEach(({ chance }, streak) => {
				expected[Math.min(streak, top)]! += missedSoFar * chance;
				missedSoFar *= 1 - chance;
			});
			expected[Math.min(newestFirst.length, top)]! += missedSoFar;
		}

		return people.map((count, index) => ({
			label: index === top ? `${top}+` : String(index),
			people: count,
			expected: expected[index]!,
		}));
	}

	get frequencyBands(): FrequencyBand[] {
		const bands: [string, number, number][] = [
			['1', 1, 1],
			['2 to 3', 2, 3],
			['4 to 7', 4, 7],
			['8 to 12', 8, 12],
		];

		return bands.map(([label, low, high]) => {
			const records = this.entered
				.map(({ record }) => record)
				.filter(({ draws }) => draws >= low && draws <= high);
			const draws = records.reduce((sum, record) => sum + record.draws, 0);
			const missed = records.reduce((sum, record) => sum + record.missed, 0);

			return { label, people: records.length, missedShare: draws === 0 ? 0 : missed / draws };
		});
	}

	get missedShare(): number {
		const draws = this.entered.reduce((sum, { record }) => sum + record.draws, 0);
		const missed = this.entered.reduce((sum, { record }) => sum + record.missed, 0);

		return draws === 0 ? 0 : missed / draws;
	}

	/** People with no number after at least 3 draws. */
	get neverPlaced(): number {
		return this.entered.filter(({ record }) => record.draws >= 3 && record.numbers === 0).length;
	}

	get frequentEntrants(): number {
		return this.entered.filter(({ record }) => record.draws >= 8).length;
	}

	get longestShutOut(): RosterPerson[] {
		return [...this.entered]
			.filter(({ record }) => record.missedInARow > 0)
			.sort(
				(a, b) =>
					b.record.missedInARow - a.record.missedInARow ||
					a.record.numbers - b.record.numbers ||
					a.name.localeCompare(b.name),
			)
			.slice(0, 7);
	}

	/** What the record of changes adds up to, as of `now`. */
	changeSummary(now: Date) {
		const day = 24 * 60 * 60 * 1000;
		const recent = this.ledger.changes.filter(
			({ createdAt }) => now.getTime() - new Date(createdAt).getTime() <= 30 * day,
		);
		const settings = this.people.flatMap(({ person }) =>
			person.weight > 1 && person.setting ? [person.setting] : [],
		);
		const byActor = new Map<string, number>();

		for (const { actorName } of recent) {
			const name = actorName ?? 'Unnamed';

			byActor.set(name, (byActor.get(name) ?? 0) + 1);
		}

		return {
			recent: recent.length,
			byActor: [...byActor].sort((a, b) => b[1] - a[1]),
			raised: this.people.filter(({ weight }) => weight > 1).length,
			endingSoon: settings.filter(
				({ endsAt }) => endsAt && new Date(endsAt).getTime() - now.getTime() <= 14 * day,
			).length,
			openEnded: settings.filter(({ scope }) => scope === 'open').length,
		};
	}

	/** How each temperature fared in a draw, reading each person's record as it stood going in. */
	missesByTemperature(drawId: string): TemperatureMisses[] {
		const tallies = new Map<TemperatureLevel, TemperatureMisses>(
			temperatureLevels.map((level) => [level, { level, missed: 0, entries: 0 }]),
		);

		for (const { person, record } of this.people) {
			const outcome = person.outcomes.find((candidate) => candidate.drawId === drawId);

			if (outcome) {
				const tally = tallies.get(new GuestTemperature(record.before(drawId)).level)!;

				tally.entries += 1;
				tally.missed += outcome.won ? 0 : 1;
			}
		}

		return [...tallies.values()];
	}
}

export function tierEntries(tiers: readonly StewardTier[]): number {
	return tiers.reduce((sum, tier) => sum + tier.entries, 0);
}
