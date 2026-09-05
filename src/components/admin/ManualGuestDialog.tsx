import styled from '@emotion/styled';
import { Button, TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useId, useState, type FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import { admissionTakesLotteryWeight, type GuestAdmission } from '../../services/guestAdmission';
import {
	lotteryWeightFor,
	lotteryWeightTiers,
	type LotteryWeightTier,
} from '../../services/lotteryWeight';
import { useRootStore } from '../../stores/react/store-context';
import { FormSection } from '../guest-view/forms/FormSection';
import { GuestInformationForm } from '../guest-view/forms/GuestInformationForm';
import { GuestLotteryForm } from '../guest-view/forms/GuestLotteryForm';
import { Dialog } from '../ui/Dialog';
import type { ManualGuest } from './types';

export type ManualGuestDialogProps = {
	open: boolean;
	/** The ways this session can accept a guest right now, most expected first. */
	admissions: GuestAdmission[];
	busy?: boolean;
	onSubmit: (guest: ManualGuest) => void;
	onClose: () => void;
};

/** The part of a manual guest the guest-facing forms do not ask: how the worker admits them. */
type AdmissionChoice = Pick<ManualGuest, 'admission' | 'lotteryWeightTier' | 'queuePlacement'>;

const Form = styled.form`
	display: grid;
	gap: 18px;

	.admission-help {
		margin: -6px 0 0;
		color: var(--color-text-subtle);
		font-size: 14px;
		line-height: 1.5;
	}
`;

function defaultChoice(admissions: GuestAdmission[]): AdmissionChoice {
	return {
		admission: admissions[0] ?? 'queue',
		lotteryWeightTier: 'standard',
		queuePlacement: 'end',
	};
}

type ManualGuestFieldsProps = Pick<ManualGuestDialogProps, 'admissions' | 'onSubmit'> & {
	formId: string;
};

/**
 * The form itself. It mounts only while the dialog is open, which is what gives every opening a
 * clean slate: the registration store is emptied on mount and the admission choice starts over.
 */
const ManualGuestFields = observer(function ManualGuestFields({
	formId,
	admissions,
	onSubmit,
}: ManualGuestFieldsProps) {
	const t = adminTranslations.en;
	const { registration } = useRootStore();
	const [choice, setChoice] = useState(() => defaultChoice(admissions));

	// The guest-facing fields read and write the registration store, which on this device may still
	// hold the last guest entered — or, on a worker's own phone, the worker.
	useEffect(() => {
		registration.clear();
	}, [registration]);

	// The session can move on while the form sits open, so never leave an illegal choice selected.
	useEffect(() => {
		setChoice((current) =>
			admissions.includes(current.admission)
				? current
				: { ...current, admission: admissions[0] ?? 'queue' },
		);
	}, [admissions]);

	function update(patch: Partial<AdmissionChoice>) {
		setChoice((current) => ({ ...current, ...patch }));
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		onSubmit({
			...registration.guest,
			...choice,
			// A tier picked before switching away from the draw must not travel with the guest.
			lotteryWeightTier: admissionTakesLotteryWeight(choice.admission)
				? choice.lotteryWeightTier
				: 'standard',
		});
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
		<Form id={formId} className="manual-guest-form" onSubmit={handleSubmit}>
			<GuestInformationForm />
			<GuestLotteryForm registrationQuestions={[]} />
			<FormSection legend={t.admissionLegend}>
				{admissions.length > 1 ? (
					<TextField
						label={t.admissionLabel}
						select
						slotProps={{ select: { native: true } }}
						value={choice.admission}
						onChange={(event) => update({ admission: event.target.value as GuestAdmission })}
					>
						{admissions.map((admission) => (
							<option key={admission} value={admission}>
								{admissionLabels[admission]}
							</option>
						))}
					</TextField>
				) : null}
				<p className="admission-help">{admissionHelp[choice.admission]}</p>
				{admissionTakesLotteryWeight(choice.admission) ? (
					<>
						<TextField
							label={t.lotteryWeightLabel}
							select
							slotProps={{ select: { native: true } }}
							value={choice.lotteryWeightTier}
							onChange={(event) =>
								update({ lotteryWeightTier: event.target.value as LotteryWeightTier })
							}
						>
							{lotteryWeightTiers.map((tier) => (
								<option key={tier} value={tier}>
									{weightLabels[tier]} (×{lotteryWeightFor(tier)})
								</option>
							))}
						</TextField>
						<p className="admission-help">{t.lotteryWeightHelp}</p>
					</>
				) : null}
				{choice.admission === 'queue' ? (
					<TextField
						label={t.queuePlacement}
						select
						slotProps={{ select: { native: true } }}
						value={choice.queuePlacement}
						onChange={(event) =>
							update({ queuePlacement: event.target.value as ManualGuest['queuePlacement'] })
						}
					>
						<option value="end">{t.placeEnd}</option>
						<option value="next">{t.placeNext}</option>
					</TextField>
				) : null}
			</FormSection>
		</Form>
	);
});

/**
 * Adding a guest by hand, in a dialog over whichever admin screen asked for it.
 *
 * The identity and household fields are the same components a guest fills in for themselves, so
 * the two never drift apart; only the admission block is the worker's alone. What the resulting
 * visit looks like depends entirely on `admissions`, which the container derives from how far the
 * session has progressed — see `admissionsFor` in `services/guestAdmission.ts`.
 */
export const ManualGuestDialog = observer(function ManualGuestDialog({
	open,
	admissions,
	busy,
	onSubmit,
	onClose,
}: ManualGuestDialogProps) {
	const t = adminTranslations.en;
	const formId = useId();

	return (
		<Dialog
			open={open}
			title={t.manualGuestTitle}
			closeLabel={t.cancel}
			onClose={onClose}
			actions={
				<>
					<Button type="button" variant="text" onClick={onClose}>
						{t.cancel}
					</Button>
					<Button type="submit" form={formId} disabled={busy}>
						{t.saveGuest}
					</Button>
				</>
			}
		>
			<ManualGuestFields formId={formId} admissions={admissions} onSubmit={onSubmit} />
		</Dialog>
	);
});
