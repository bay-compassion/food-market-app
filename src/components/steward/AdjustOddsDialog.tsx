import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';

import { DrawSimulation } from '../../models/draw-simulation';
import type { RosterPerson } from '../../models/steward-roster';
import { tierEntries } from '../../models/steward-roster';
import {
	oddsReasons,
	oddsWeights,
	type OddsReason,
	type OddsScope,
	type OddsWeight,
} from '../../services/steward-api';
import { useRootStore } from '../../stores/react/store-context';
import { Dialog } from '../ui/Dialog';
import { percent } from './format';
import { useSteward } from './steward-context';
import { Chip, Note, PillButton } from './steward.styles';
import { tierLabel } from './temperature-styles';

const Form = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;
`;

const Field = styled.fieldset`
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin: 0;
	padding: 0;
	border: 0;

	legend {
		padding: 0 0 8px;
		font-weight: 700;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
`;

const Estimate = styled.div`
	padding: 12px;
	border-radius: var(--radius-sm);
	background: var(--color-surface-soft);

	strong {
		display: block;
		color: var(--color-brand-dark);
		font-family: var(--font-heading);
		font-size: 22px;
	}
`;

const NoteField = styled.label`
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

const Save = styled(PillButton)`
	border: 0;
	color: var(--color-on-brand);
	background: var(--color-brand);
`;

const scopes: [OddsScope, string, string][] = [
	['next', 'This Saturday Only', 'Applies to the next draw, and can change until it runs.'],
	['weeks', 'Next 8 Saturdays', 'Ends on its own, so raised odds do not pile up unnoticed.'],
	['open', 'Until Changed', 'Stays on until a steward changes it.'],
];

export const AdjustOddsDialog = observer(function AdjustOddsDialog({
	person,
	onClose,
}: {
	person: RosterPerson;
	onClose: () => void;
}) {
	const steward = useSteward();
	const { notifications } = useRootStore();
	const roster = steward.roster!;
	const [weight, setWeight] = useState<OddsWeight>(
		oddsWeights.find((candidate) => candidate === person.weight) ?? 1,
	);
	const [scope, setScope] = useState<OddsScope>('weeks');
	const [reason, setReason] = useState<OddsReason | null>(null);
	const [note, setNote] = useState('');
	const [showError, setShowError] = useState(false);
	const pool = useMemo(() => {
		const { upcoming } = roster.ledger;

		if (upcoming && tierEntries(upcoming.tiers) > 0) {
			return { tiers: upcoming.tiers, spots: upcoming.spots, source: 'the next draw so far' };
		}

		const last = roster.lastDraw;

		return last
			? {
					tiers: last.tiers,
					spots: last.tiers.reduce((sum, tier) => sum + tier.placed, 0),
					source: 'the last draw',
				}
			: null;
	}, [roster]);
	const chances = useMemo(() => {
		if (!pool) {
			return null;
		}

		const simulation = new DrawSimulation(pool.tiers, pool.spots);

		return new Map(
			[...new Set([...oddsWeights, person.weight])].map((candidate) => [
				candidate,
				simulation.chanceAt(candidate),
			]),
		);
	}, [pool, person.weight]);

	async function save() {
		if (!reason) {
			setShowError(true);

			return;
		}

		try {
			await steward.saveOdds(person.id, { weight, scope, reason, note });
			notifications.success(`${person.name} is now ${tierLabel(weight)}.`);
			onClose();
		} catch (cause) {
			notifications.error(cause instanceof Error ? cause.message : 'That could not be saved.');
		}
	}

	return (
		<Dialog
			open
			title="Adjust Odds"
			closeLabel="Close"
			onClose={onClose}
			actions={
				<>
					<PillButton type="button" onClick={onClose}>
						Cancel
					</PillButton>
					<Save type="button" disabled={steward.saving} onClick={() => void save()}>
						Save Odds
					</Save>
				</>
			}
		>
			<Form data-sentry-mask>
				<Note>{person.name}</Note>
				<Field>
					<legend>Chance in the Draw</legend>
					<div className="chips">
						{oddsWeights.map((candidate) => (
							<Chip
								key={candidate}
								type="button"
								selected={weight === candidate}
								aria-pressed={weight === candidate}
								onClick={() => setWeight(candidate)}
							>
								{tierLabel(candidate)}
							</Chip>
						))}
					</div>
				</Field>
				{pool && chances ? (
					<Estimate>
						<strong>
							About {percent(chances.get(person.weight) ?? 0)} → {percent(chances.get(weight) ?? 0)}
						</strong>
						<Note>Estimated from {pool.source}. It is never a guarantee.</Note>
					</Estimate>
				) : null}
				<Field>
					<legend>How Long</legend>
					<div className="chips">
						{scopes.map(([value, label]) => (
							<Chip
								key={value}
								type="button"
								selected={scope === value}
								aria-pressed={scope === value}
								onClick={() => setScope(value)}
							>
								{label}
							</Chip>
						))}
					</div>
					<Note>{scopes.find(([value]) => value === scope)?.[2]}</Note>
				</Field>
				<Field>
					<legend>Reason</legend>
					<div className="chips">
						{oddsReasons.map((candidate) => (
							<Chip
								key={candidate}
								type="button"
								selected={reason === candidate}
								aria-pressed={reason === candidate}
								onClick={() => {
									setReason(candidate);
									setShowError(false);
								}}
							>
								{candidate}
							</Chip>
						))}
					</div>
					{showError ? (
						<div role="alert" style={{ color: 'var(--color-error)', fontWeight: 500 }}>
							Choose a reason before saving.
						</div>
					) : null}
				</Field>
				<NoteField>
					Note (Optional)
					<input
						type="text"
						maxLength={280}
						value={note}
						onChange={(event) => setNote(event.target.value)}
					/>
				</NoteField>
				<Note>Other stewards can read this. Leave out health, immigration, and money details.</Note>
			</Form>
		</Dialog>
	);
});
