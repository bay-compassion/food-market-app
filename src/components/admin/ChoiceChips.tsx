import styled from '@emotion/styled';

const Group = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 8px;

	button {
		min-height: 40px;
		padding: 0 14px;
		border: 1.5px solid var(--color-border-soft);
		border-radius: var(--radius-pill);
		color: var(--color-text-muted);
		background: var(--color-background);
		font: inherit;
		font-size: 14px;
		font-weight: 700;
		white-space: nowrap;
		cursor: pointer;
	}

	button[aria-pressed='true'] {
		border-color: var(--color-brand);
		color: var(--color-on-brand);
		background: var(--color-brand);
	}
`;

export type ChoiceChipsProps<T extends string> = {
	/** Names the group for assistive technology. */
	label: string;
	options: readonly { value: T; label: string }[];
	value: T;
	onChange: (value: T) => void;
};

/**
 * One choice out of a few, as a row of pills that wraps rather than scrolls, so every option is in
 * sight on a phone. Each pill is a toggle button, pressed when it is the choice.
 */
export function ChoiceChips<T extends string>({
	label,
	options,
	value,
	onChange,
}: ChoiceChipsProps<T>) {
	return (
		<Group role="group" aria-label={label}>
			{options.map((option) => (
				<button
					key={option.value}
					type="button"
					aria-pressed={option.value === value}
					onClick={() => onChange(option.value)}
				>
					{option.label}
				</button>
			))}
		</Group>
	);
}
