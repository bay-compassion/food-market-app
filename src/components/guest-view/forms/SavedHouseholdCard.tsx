import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';

import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { useAgeRangeLabels } from './use-age-range-labels';
import { useGuestFormCopy } from './use-guest-form-copy';

const Card = styled.section`
	position: relative;
	display: grid;
	gap: 14px;
	padding: 16px;
	border: 2px solid var(--color-brand);
	border-radius: var(--radius-md);
	background: var(--color-surface-soft);

	h3 {
		margin: 0;
		color: var(--color-text);
		font-size: 20px;
		font-weight: 700;
		line-height: 1.25;
	}
`;

const Eyebrow = styled.p`
	margin: 0 0 4px;
	color: var(--color-brand);
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
`;

const Values = styled.dl`
	display: grid;
	gap: 10px;
	margin: 0;

	div {
		display: grid;
		gap: 2px;
	}

	dt {
		color: var(--color-text-muted);
		font-size: 14px;
		line-height: 1.35;
	}

	dd {
		margin: 0;
		color: var(--color-text);
		font-size: 17px;
		font-weight: 700;
	}
`;

const Actions = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 10px;

	button {
		min-height: 48px;
	}
`;

const ConfirmedRow = styled.div`
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 6px 4px 6px 16px;
	border: 1px solid var(--color-border-soft);
	border-radius: var(--radius-md);

	svg {
		flex: 0 0 auto;
		width: 26px;
		height: 26px;
		color: var(--color-success);
	}

	strong {
		flex: 1 1 auto;
		font-size: 16px;
	}

	button {
		min-height: 44px;
	}
`;

/**
 * The household this phone saved from the guest's last visit, shown in place of its fields so a
 * returning guest says it is still right rather than sailing past values they never looked at.
 */
export const SavedHouseholdCard = observer(function SavedHouseholdCard() {
	const t = useTranslation();
	const copy = useGuestFormCopy();
	const ageRangeLabels = useAgeRangeLabels();
	const { registration } = useRootStore();
	const { guest } = registration;
	const strings = t.guestView.forms.savedHousehold;

	if (registration.savedHouseholdReview === 'confirmed') {
		return (
			<ConfirmedRow className="saved-household-confirmed">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="10" />
					<path d="M7.5 12.5l3 3 6-6.5" />
				</svg>
				<strong>{strings.confirmed}</strong>
				<Button variant="text" onClick={() => registration.startHouseholdChange()}>
					{strings.change}
				</Button>
			</ConfirmedRow>
		);
	}

	return (
		<Card className="saved-household" aria-labelledby="saved-household-heading">
			<div>
				<Eyebrow>{strings.eyebrow}</Eyebrow>
				<h3 id="saved-household-heading">{strings.heading}</h3>
			</div>
			<Values>
				<div>
					<dt>{t.age}</dt>
					<dd>{guest.ageRange === '' ? '' : ageRangeLabels[guest.ageRange]}</dd>
				</div>
				<div>
					<dt>{copy.household}</dt>
					<dd>{guest.householdSize}</dd>
				</div>
				<div>
					<dt>{copy.childrenCount}</dt>
					<dd>{guest.childrenCount}</dd>
				</div>
				<div>
					<dt>{copy.seniorsCount}</dt>
					<dd>{guest.seniorsCount}</dd>
				</div>
			</Values>
			<Actions>
				<Button variant="contained" onClick={() => registration.confirmSavedHousehold()}>
					{strings.confirm}
				</Button>
				<Button variant="outlined" onClick={() => registration.startHouseholdChange()}>
					{strings.change}
				</Button>
			</Actions>
			<ConfirmationRequired message={strings.prompt} />
		</Card>
	);
});

/**
 * An empty required control, so a guest who taps "Join" before answering is taken here by the
 * browser's own validation — the same way an empty field takes them to it — and told what to do.
 * Visually hidden rather than `hidden`: a control the browser cannot focus fails validation
 * silently. Out of the tab order, since the buttons above are what a guest actually uses.
 *
 * A checkbox, since it stands for "confirmed" — and because the browser focuses it to show the
 * message, which on a phone would bring up the keyboard for a text box.
 */
function ConfirmationRequired({ message }: { message: string }) {
	const input = useRef<HTMLInputElement>(null);

	useEffect(() => {
		input.current?.setCustomValidity(message);
	}, [message]);

	return (
		<input
			ref={input}
			className="sr-only"
			style={{ insetBlockEnd: 0, insetInlineStart: '50%' }}
			aria-label={message}
			type="checkbox"
			tabIndex={-1}
			required
			checked={false}
			onChange={() => {}}
		/>
	);
}
