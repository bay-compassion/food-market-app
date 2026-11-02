import styled from '@emotion/styled';

import type { TemperatureLevel } from '../../models/guest-temperature';
import { temperatureStyles } from './temperature-styles';

const Pill = styled.span`
	display: inline-block;
	padding: 2px 10px;
	border: 1px solid;
	border-radius: var(--radius-pill);
	font-size: 12px;
	font-weight: 700;
	white-space: nowrap;
`;

export function TemperaturePill({ level }: { level: TemperatureLevel }) {
	const { background, color, border, label } = temperatureStyles[level];

	return <Pill style={{ background, color, borderColor: border }}>{label}</Pill>;
}
