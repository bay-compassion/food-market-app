import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useId, useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';
import { NumberSpinner } from '../NumberSpinner';
import { BottomSheet } from '../ui/BottomSheet';
import { formatClockTime } from './session-format';

const Choices = styled.div`
	display: grid;
	gap: 8px;

	.label {
		margin: 0;
		color: var(--color-text-subtle);
		font-size: 14px;
		font-weight: 700;
	}

	.chips {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 8px;
	}

	/* A phone-width row of four fits the words only without the theme's wider padding. */
	.chips button {
		min-width: 0;
		min-height: 44px;
		padding-inline: 4px;
	}
`;

const Sheet = styled.form`
	display: grid;
	gap: 16px;

	h2,
	p {
		margin: 0;
	}

	h2 {
		font-family: var(--font-heading);
		font-size: 22px;
		font-weight: 700;
		line-height: 1.2;
	}

	.current {
		color: var(--color-text-muted);
		font-size: 15px;
		line-height: 1.5;
	}

	.result {
		color: var(--color-brand-dark);
		font-weight: 700;
	}

	.answers {
		display: grid;
		gap: 10px;
		margin-top: 6px;
	}
`;

/** The words that change between moving the opening time and moving the closing time. */
export type MinuteChoicesCopy = {
	/** Names the chips, and titles the sheet. */
	label: string;
	current: string;
	minutesLabel: string;
	result: string;
	action: string;
};

export type MinuteChoicesProps = {
	copy: MinuteChoicesCopy;
	minutes: readonly number[];
	/** The time being moved. */
	from: Date;
	busy?: boolean;
	onChoose: (minutes: number) => void;
};

const defaultCustomMinutes = 20;
const maxMinutes = 1440;

/**
 * Moving a time by a common amount in one tap, which applies straight away, or by any amount from
 * a sheet. The sheet is what makes the immediate chips safe to offer alongside a typed number: the
 * number is entered somewhere it cannot take effect until the worker has read the new time.
 */
export const MinuteChoices = observer(function MinuteChoices({
	copy,
	minutes,
	from,
	busy,
	onChoose,
}: MinuteChoicesProps) {
	const t = adminTranslations.en;
	const { translations } = useRootStore();
	const [isOpen, setIsOpen] = useState(false);
	const [custom, setCustom] = useState(defaultCustomMinutes);
	const labelId = useId();
	const titleId = useId();
	const time = (date: Date) => formatClockTime(date, translations.locale);
	const moved = time(new Date(from.valueOf() + custom * 60_000));

	return (
		<Choices>
			<p className="label" id={labelId}>
				{copy.label}
			</p>
			<div className="chips" role="group" aria-labelledby={labelId}>
				{minutes.map((choice) => (
					<Button
						key={choice}
						type="button"
						variant="outlined"
						size="medium"
						disabled={busy}
						onClick={() => onChoose(choice)}
					>
						{t.today.minutes.replace('{minutes}', String(choice))}
					</Button>
				))}
				<Button
					type="button"
					variant="outlined"
					size="medium"
					disabled={busy}
					onClick={() => setIsOpen(true)}
				>
					{t.today.custom}
				</Button>
			</div>
			<BottomSheet
				anchor="bottom"
				open={isOpen}
				onClose={() => setIsOpen(false)}
				slotProps={{ paper: { role: 'dialog', 'aria-labelledby': titleId } }}
			>
				<Sheet
					onSubmit={(event) => {
						event.preventDefault();
						setIsOpen(false);
						onChoose(custom);
					}}
				>
					<h2 id={titleId}>{copy.label}</h2>
					<p className="current">{copy.current.replace('{time}', time(from))}</p>
					<NumberSpinner
						label={copy.minutesLabel}
						value={custom}
						min={1}
						max={maxMinutes}
						required
						onChange={(value) => setCustom(Number(value))}
						decrementLabel={t.decreaseNumber}
						incrementLabel={t.increaseNumber}
					/>
					<p className="result">{copy.result.replace('{time}', moved)}</p>
					<div className="answers">
						<Button type="submit" disabled={busy}>
							{copy.action.replace('{time}', moved)}
						</Button>
						<Button type="button" variant="text" onClick={() => setIsOpen(false)}>
							{t.cancel}
						</Button>
					</div>
				</Sheet>
			</BottomSheet>
		</Choices>
	);
});
