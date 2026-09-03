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

const Form = styled.form`
	display: grid;
	grid-template-columns: 110px minmax(0, 1fr);
	gap: 12px;
	align-items: end;
	margin-top: 0;
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

	return (
		<Form className="call-next" onSubmit={handleSubmit}>
			<label>
				<span>{t.callNextCount}</span>
				<input
					type="number"
					min="1"
					max="50"
					step="1"
					required
					value={count}
					onChange={(event) => onCountChange(Number(event.target.value))}
				/>
			</label>
			<Button type="submit" disabled={busy || waitingCount === 0}>
				{t.callNext}
			</Button>
		</Form>
	);
}
