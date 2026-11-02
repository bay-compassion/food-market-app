import type { TemperatureLevel } from '../../models/guest-temperature';

/** Blue to orange, and differing in lightness too, so the scale survives colorblindness. */
export const temperatureStyles: Record<
	TemperatureLevel,
	{ label: string; background: string; color: string; border: string }
> = {
	cold: { label: 'Cold', background: '#2166ac', color: '#fff', border: 'transparent' },
	cool: { label: 'Cool', background: '#bcd7f0', color: '#123e6b', border: 'transparent' },
	even: { label: 'Even', background: '#e4eae7', color: '#3d453f', border: 'transparent' },
	warm: { label: 'Warm', background: '#fad6b2', color: '#6e3300', border: 'transparent' },
	hot: { label: 'Hot', background: '#b9480f', color: '#fff', border: 'transparent' },
	new: {
		label: 'New',
		background: 'var(--color-surface)',
		color: 'var(--color-text-muted)',
		border: 'var(--color-border-soft)',
	},
};

/** A tier's fill, darker the better the odds. */
export function tierColor(weight: number): string {
	if (weight <= 1) {
		return '#a9d6dc';
	}

	return weight < 5 ? '#4b8f99' : '#1e474d';
}

export function tierLabel(weight: number): string {
	if (weight <= 1) {
		return 'Standard';
	}

	return weight < 5 ? `Higher ×${weight}` : `Highest ×${weight}`;
}
