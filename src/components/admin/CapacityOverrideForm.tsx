import { Button } from '@mui/material';
import { useState, type FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import { NumberSpinner } from '../NumberSpinner';

export type CapacityOverrideFormProps = {
	/** The session's current capacity, which the field starts from. */
	capacity: number;
	busy?: boolean;
	onSave: (capacity: number) => void;
};

/**
 * Changes an open session's capacity. The field is local state seeded from the session, so a poll
 * that brings back the same session does not overwrite what a worker is typing — render it with
 * the session's id as its `key` so a different session starts fresh.
 */
export function CapacityOverrideForm({ capacity, busy, onSave }: CapacityOverrideFormProps) {
	const t = adminTranslations.en;
	const [value, setValue] = useState(capacity);

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		onSave(value);
	}

	return (
		<form onSubmit={handleSubmit}>
			<NumberSpinner
				disabled={busy}
				label={t.capacity}
				value={value}
				onChange={(value) => setValue(Number(value))}
				min={1}
				max={10000}
				required
				decrementLabel={t.decreaseNumber}
				incrementLabel={t.increaseNumber}
			/>
			<Button type="submit" variant="outlined" disabled={busy}>
				{t.updateCapacity}
			</Button>
		</form>
	);
}
