import styled from '@emotion/styled';
import { Button } from '@mui/material';
import type { FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';

export type QueueCallNextProps = {
	waitingCount: number;
	busy?: boolean;
	count: number;
	onCountChange: (count: number) => void;
	onCall: () => void;
};

const minCount = 1;
const maxCount = 50;

const Form = styled.form`
	/* Doubled to outrank the \`.admin-dashboard form\` layout in admin.css. */
	&& {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 10px;
		align-items: stretch;
		margin-top: 0;
	}

	.stepper {
		display: grid;
		grid-template-columns: 44px 48px 44px;
		border: 2px solid var(--color-border);
		border-radius: var(--radius-pill);
		overflow: hidden;
	}

	.stepper button {
		border: 0;
		color: var(--color-brand);
		background: var(--color-background);
		font-size: 22px;
		font-weight: 700;
		line-height: 1;
	}

	.stepper button:disabled {
		color: var(--color-placeholder);
	}

	.stepper input {
		min-width: 0;
		min-height: 0;
		height: 100%;
		margin: 0;
		padding: 0;
		border: 0;
		border-radius: 0;
		color: var(--color-text);
		background: var(--color-surface-soft);
		font-size: 18px;
		font-weight: 700;
		text-align: center;
		appearance: textfield;
	}

	.stepper input::-webkit-inner-spin-button,
	.stepper input::-webkit-outer-spin-button {
		margin: 0;
		appearance: none;
	}
`;

/** How many waiting guests to call up at once, and the button that does it. */
export function QueueCallNext({
	waitingCount,
	busy,
	count,
	onCountChange,
	onCall,
}: QueueCallNextProps) {
	const t = adminTranslations.en;

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		onCall();
	}

	function step(delta: number) {
		onCountChange(Math.min(maxCount, Math.max(minCount, count + delta)));
	}

	return (
		<Form className="call-next" onSubmit={handleSubmit}>
			<div className="stepper" role="group" aria-label={t.callNextCount}>
				<button
					type="button"
					aria-label={t.callFewer}
					disabled={count <= minCount}
					onClick={() => step(-1)}
				>
					−
				</button>
				<input
					type="number"
					min={minCount}
					max={maxCount}
					step="1"
					required
					aria-label={t.callNextCount}
					value={count}
					onChange={(event) => onCountChange(Number(event.target.value))}
				/>
				<button
					type="button"
					aria-label={t.callMore}
					disabled={count >= maxCount}
					onClick={() => step(1)}
				>
					+
				</button>
			</div>
			<Button type="submit" disabled={busy || waitingCount === 0}>
				{t.callNext}
			</Button>
		</Form>
	);
}
