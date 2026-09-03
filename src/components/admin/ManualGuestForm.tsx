import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useState, type FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { GuestAdmission } from '../../services/guestAdmission';
import {
	lotteryWeightFor,
	lotteryWeightTiers,
	type LotteryWeightTier,
} from '../../services/lotteryWeight';
import { ManualGuestDetails } from './ManualGuestDetails';
import type { ManualGuest } from './types';

export type ManualGuestFormProps = {
	/** The ways this session can accept a guest right now, most expected first. */
	admissions: GuestAdmission[];
	busy?: boolean;
	onSubmit: (guest: ManualGuest) => void;
	onCancel: () => void;
};

const Form = styled.form`
	.admission-help {
		margin: -6px 0 0;
		color: var(--color-text-subtle);
		font-size: 14px;
		line-height: 1.5;
	}
`;

function emptyGuest(admission: GuestAdmission): ManualGuest {
	return {
		firstName: '',
		lastName: '',
		ageRange: '',
		householdSize: 1,
		childrenCount: 0,
		seniorsCount: 0,
		phone: '',
		queuePlacement: 'end',
		admission,
		lotteryWeightTier: 'standard',
	};
}

/**
 * Adding a guest by hand. What the resulting visit looks like depends entirely on `admissions`,
 * which the container derives from how far the session has progressed — see `admissionsFor` in
 * `services/guestAdmission.ts`.
 */
export const ManualGuestForm = observer(function ManualGuestForm({
	admissions,
	busy,
	onSubmit,
	onCancel,
}: ManualGuestFormProps) {
	const t = adminTranslations.en;
	const [guest, setGuest] = useState(() => emptyGuest(admissions[0] ?? 'queue'));

	// The session can move on while the form sits open, so never leave an illegal choice selected.
	useEffect(() => {
		setGuest((current) =>
			admissions.includes(current.admission)
				? current
				: { ...current, admission: admissions[0] ?? 'queue' },
		);
	}, [admissions]);

	function update(patch: Partial<ManualGuest>) {
		setGuest((current) => ({ ...current, ...patch }));
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		onSubmit({ ...guest });
	}

	const admissionLabels: Record<GuestAdmission, string> = {
		lottery: t.admitToLottery,
		queue: t.admitToQueue,
		served: t.admitAsServed,
	};
	const admissionHelp: Record<GuestAdmission, string> = {
		lottery: t.admitToLotteryHelp,
		queue: t.admitToQueueHelp,
		served: t.admitAsServedHelp,
	};
	const weightLabels: Record<LotteryWeightTier, string> = {
		standard: t.weightStandard,
		higher: t.weightHigher,
		highest: t.weightHighest,
	};

	return (
		<Form className="manual-form" onSubmit={handleSubmit}>
			<h3>{t.manualGuestTitle}</h3>
			<ManualGuestDetails guest={guest} onChange={update} />
			{admissions.length > 1 ? (
				<label>
					<span>{t.admissionLabel}</span>
					<select
						value={guest.admission}
						onChange={(event) => update({ admission: event.target.value as GuestAdmission })}
					>
						{admissions.map((admission) => (
							<option key={admission} value={admission}>
								{admissionLabels[admission]}
							</option>
						))}
					</select>
				</label>
			) : null}
			<p className="admission-help">{admissionHelp[guest.admission]}</p>
			{/* Odds only mean anything for a guest actually going into the draw. */}
			{guest.admission === 'lottery' ? (
				<>
					<label>
						<span>{t.lotteryWeightLabel}</span>
						<select
							value={guest.lotteryWeightTier}
							onChange={(event) =>
								update({ lotteryWeightTier: event.target.value as LotteryWeightTier })
							}
						>
							{lotteryWeightTiers.map((tier) => (
								<option key={tier} value={tier}>
									{weightLabels[tier]} (×{lotteryWeightFor(tier)})
								</option>
							))}
						</select>
					</label>
					<p className="admission-help">{t.lotteryWeightHelp}</p>
				</>
			) : null}
			{guest.admission === 'queue' ? (
				<label>
					<span>{t.queuePlacement}</span>
					<select
						value={guest.queuePlacement}
						onChange={(event) =>
							update({ queuePlacement: event.target.value as ManualGuest['queuePlacement'] })
						}
					>
						<option value="end">{t.placeEnd}</option>
						<option value="next">{t.placeNext}</option>
					</select>
				</label>
			) : null}
			<div className="manual-actions">
				<button type="button" onClick={onCancel}>
					{t.cancel}
				</button>
				<Button type="submit" disabled={busy}>
					{t.saveGuest}
				</Button>
			</div>
		</Form>
	);
});
