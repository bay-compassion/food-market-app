import styled from '@emotion/styled';

import { temperatureLevels, type TemperatureLevel } from '../../models/guest-temperature';
import { temperatureStyles } from './temperature-styles';

const Bar = styled.div`
	display: flex;
	gap: 2px;
`;

const Segment = styled.button`
	min-width: 56px;
	min-height: 44px;
	padding: 2px 4px;
	border: 1px solid;
	font: inherit;
	font-size: 12px;
	font-weight: 700;
	line-height: 1.2;
	cursor: pointer;

	&:disabled {
		cursor: default;
	}

	&[aria-pressed='true'] {
		outline: 3px solid var(--color-focus);
		outline-offset: -3px;
	}
`;

export type TemperatureBarProps = {
	counts: Record<TemperatureLevel, number>;
	/** With these, the bar filters a list. Without them it is only a picture. */
	selected?: TemperatureLevel | null;
	onSelect?: (level: TemperatureLevel | null) => void;
};

export function TemperatureBar({ counts, selected, onSelect }: TemperatureBarProps) {
	return (
		<Bar role={onSelect ? 'group' : undefined} aria-label="Temperature">
			{temperatureLevels.map((level) => {
				const { background, color, border, label } = temperatureStyles[level];

				return (
					<Segment
						key={level}
						type="button"
						disabled={!onSelect}
						aria-pressed={onSelect ? selected === level : undefined}
						style={{
							flex: `${Math.max(counts[level], 1)} 1 0`,
							background,
							color,
							borderColor: border,
						}}
						onClick={() => onSelect?.(selected === level ? null : level)}
					>
						{label}
						<br />
						{counts[level]}
					</Segment>
				);
			})}
		</Bar>
	);
}
