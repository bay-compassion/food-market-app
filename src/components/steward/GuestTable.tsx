import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';

import type { TemperatureLevel } from '../../models/guest-temperature';
import type { RosterPerson } from '../../models/steward-roster';
import { shortDate } from './format';
import { useSteward } from './steward-context';
import { Card, Note, Table, TableFrame } from './steward.styles';
import { TemperatureBar } from './TemperatureBar';
import { TemperaturePill } from './TemperaturePill';

const Search = styled.label`
	display: flex;
	flex-direction: column;
	gap: 4px;
	font-size: 14px;
	font-weight: 500;

	input {
		height: 44px;
		box-sizing: border-box;
		padding: 0 14px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text);
		background: var(--color-surface);
		font: inherit;
		font-weight: 400;
	}
`;

const HeaderButton = styled.button`
	min-height: 44px;
	padding: 0;
	border: 0;
	color: inherit;
	background: transparent;
	font: inherit;
	font-weight: 700;
	cursor: pointer;
`;

const NameButton = styled.button`
	min-height: 44px;
	padding: 0;
	border: 0;
	color: var(--color-text);
	background: transparent;
	font: inherit;
	font-weight: 500;
	text-align: start;
	cursor: pointer;

	small {
		margin-inline-start: 6px;
		color: var(--color-text-subtle);
		font-size: 12px;
		font-weight: 400;
	}
`;

/* The columns a phone can't fit. Temperature and the streak say the most in the least room. */
const Rows = styled(Table)`
	@media (max-width: 639px) {
		.wide {
			display: none;
		}
	}

	tr[data-selected='true'] > * {
		background: var(--color-surface-soft);
	}
`;

type Column = {
	key: string;
	label: string;
	wide?: boolean;
	value: (person: RosterPerson) => number | string;
};

const columns: Column[] = [
	{ key: 'name', label: 'Guest', value: (person) => person.name },
	{ key: 'temperature', label: 'Temperature', value: (person) => person.temperatureRank },
	{ key: 'draws', label: 'Draws', wide: true, value: ({ record }) => record.draws },
	{ key: 'numbers', label: 'Numbers', wide: true, value: ({ record }) => record.numbers },
	{ key: 'streak', label: 'Missed in a Row', value: ({ record }) => record.missedInARow },
	{
		key: 'last',
		label: 'Last Number',
		wide: true,
		value: ({ lastNumberAt }) => lastNumberAt ?? '',
	},
	{ key: 'odds', label: 'Odds', value: (person) => person.weight },
];

export const GuestTable = observer(function GuestTable() {
	const steward = useSteward();
	const roster = steward.roster!;
	const [level, setLevel] = useState<TemperatureLevel | null>(null);
	const [query, setQuery] = useState('');
	const [sort, setSort] = useState({ key: 'temperature', ascending: true });
	const shown = useMemo(() => {
		const words = query.trim().toLocaleLowerCase();
		const column = columns.find(({ key }) => key === sort.key) ?? columns[1]!;

		return roster.people
			.filter(
				({ temperature, name, person }) =>
					(!level || temperature === level) &&
					(!words || name.toLocaleLowerCase().includes(words) || person.phoneLast4.includes(words)),
			)
			.sort((a, b) => {
				const [x, y] = [column.value(a), column.value(b)];
				const order =
					typeof x === 'number' && typeof y === 'number'
						? x - y
						: String(x).localeCompare(String(y));

				return (sort.ascending ? order : -order) || a.name.localeCompare(b.name);
			});
	}, [roster, level, query, sort]);

	return (
		<Card>
			<Search>
				Search
				<input
					type="search"
					placeholder="Name or last 4 digits"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
				/>
			</Search>
			<TemperatureBar counts={roster.temperatureCounts} selected={level} onSelect={setLevel} />
			<TableFrame>
				<Rows>
					<thead>
						<tr>
							{columns.map(({ key, label, wide }) => (
								<th
									key={key}
									scope="col"
									className={wide ? 'wide' : undefined}
									aria-sort={
										sort.key === key ? (sort.ascending ? 'ascending' : 'descending') : 'none'
									}
								>
									<HeaderButton
										type="button"
										onClick={() =>
											setSort(({ key: current, ascending }) => ({
												key,
												ascending: current === key ? !ascending : true,
											}))
										}
									>
										{label}
										{sort.key === key ? (sort.ascending ? ' ↑' : ' ↓') : ''}
									</HeaderButton>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{shown.map((person) => (
							<tr key={person.id} data-selected={person.id === steward.selectedId}>
								<th scope="row">
									<NameButton type="button" onClick={() => steward.select(person.id)}>
										{person.name}
										<small>•• {person.person.phoneLast4}</small>
									</NameButton>
								</th>
								<td>
									<TemperaturePill level={person.temperature} />
								</td>
								<td className="wide">{person.record.draws}</td>
								<td className="wide">{person.record.numbers}</td>
								<td>{person.record.missedInARow}</td>
								<td className="wide">
									{person.lastNumberAt ? shortDate(person.lastNumberAt) : 'Never'}
								</td>
								<td>
									<strong>×{person.weight}</strong>
								</td>
							</tr>
						))}
					</tbody>
				</Rows>
			</TableFrame>
			{shown.length === 0 ? <Note>No guests match.</Note> : null}
		</Card>
	);
});
