import styled from '@emotion/styled';
import { useEffect, useId, useRef, useState, type FocusEvent, type ReactNode } from 'react';

import { AddIcon } from './icons/AddIcon';
import { ExpandMoreIcon } from './icons/ExpandMoreIcon';

export type AttachedFieldProps = {
	/**
	 * The field this one hangs from — a `TextField` without helper text, so nothing sits between
	 * its outline and the strip. Its bottom corners are squared to join the two. Without one, the
	 * strip stands alone with a full outline of its own.
	 */
	children?: ReactNode;
	/** What the folded strip offers, as a short phrase: "Add how to say your name". */
	offer: string;
	/** The open field's label, shown in front of it: "Sounds like". */
	label: string;
	/** Under the open field: what to write in it. */
	hint?: string;
	/** The accessible name of the button that folds the field away again. */
	collapseLabel: string;
	value: string;
	onChange: (value: string) => void;
	onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
	maxLength?: number;
};

const Group = styled.div`
	display: grid;

	/* The outline MUI draws inherits the root's radius, so squaring the root squares both. */
	&[data-attached='true'] > .anchor .MuiOutlinedInput-root {
		border-end-start-radius: 0;
		border-end-end-radius: 0;
	}

	.strip,
	.row {
		box-sizing: border-box;
		display: flex;
		align-items: center;
		border: 2px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-muted);
		background: var(--color-surface-soft);
	}

	&[data-attached='true'] .strip,
	&[data-attached='true'] .row {
		border-top: 0;
		border-start-start-radius: 0;
		border-start-end-radius: 0;
	}

	/*
	 * The strip is drawn 32px tall to stay out of the way, but the button around it is a full 44px
	 * touch target; the transparent rest of it reaches into the gap below.
	 */
	.offer {
		box-sizing: border-box;
		height: 44px;
		margin: 0 0 -12px;
		padding: 0 0 12px;
		border: 0;
		background: none;
		font: inherit;
		text-align: start;
		cursor: pointer;
	}

	.offer:focus-visible {
		outline: 0;
	}

	.offer:focus-visible .strip {
		outline: 3px solid var(--color-focus);
		outline-offset: 2px;
	}

	.strip {
		gap: 6px;
		height: 32px;
		padding-inline: 12px 10px;
		font-size: 13px;
		font-weight: 500;
	}

	.strip .text {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.strip .value {
		color: var(--color-text);
	}

	svg {
		flex-shrink: 0;
		font-size: 18px;
	}

	.row {
		gap: 8px;
		height: 48px;
		padding-inline: 14px 0;
	}

	.row:has(input:focus-visible) {
		outline: 3px solid var(--color-focus);
		outline-offset: 2px;
	}

	.row label {
		font-size: 13px;
		font-weight: 500;
		white-space: nowrap;
	}

	.row input {
		flex: 1;
		min-width: 0;
		height: 100%;
		padding: 0;
		border: 0;
		color: var(--color-text);
		background: none;
		font-family: var(--font-body);
		/* 16px keeps a phone from zooming in on focus. */
		font-size: 16px;
	}

	.row input:focus-visible {
		outline: 0;
	}

	.collapse {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		padding: 0;
		border: 0;
		border-radius: var(--radius-sm);
		color: inherit;
		background: none;
		cursor: pointer;
	}

	.collapse svg {
		transform: rotate(180deg);
	}

	.hint {
		margin: 6px 0 0;
		padding-inline: 14px;
		color: var(--color-text-subtle);
		font-size: 12px;
		line-height: 1.4;
	}
`;

/**
 * An optional, secondary field folded into a thin strip under the field it belongs to — the
 * pronunciation under a first name, say. Tapping the strip opens it into a slim field joined to
 * the one above; folding it again keeps what was written and shows it in the strip.
 *
 * The parent owns the value, as it would for any input; this only owns whether it is open.
 */
export function AttachedField({
	children,
	offer,
	label,
	hint,
	collapseLabel,
	value,
	onChange,
	onBlur,
	maxLength,
}: AttachedFieldProps) {
	const id = useId();
	const inputId = `${id}-input`;
	const hintId = `${id}-hint`;
	const [isOpen, setIsOpen] = useState(false);
	// Focus follows the guest's own tap — into the field on opening, back to the strip on folding —
	// and never moves on the first render.
	const [focusTarget, setFocusTarget] = useState<'input' | 'offer' | null>(null);
	const input = useRef<HTMLInputElement>(null);
	const offerButton = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		(focusTarget === 'input' ? input : offerButton).current?.focus();
	}, [focusTarget]);

	const open = () => {
		setIsOpen(true);
		setFocusTarget('input');
	};

	const fold = () => {
		setIsOpen(false);
		setFocusTarget('offer');
	};

	const written = value.trim();

	return (
		<Group className="attached-field" data-attached={children !== undefined}>
			{children === undefined ? null : <div className="anchor">{children}</div>}
			{isOpen ? (
				<div>
					<div className="row">
						<label htmlFor={inputId}>{label}</label>
						<input
							ref={input}
							id={inputId}
							value={value}
							onChange={(event) => onChange(event.target.value)}
							onBlur={onBlur}
							maxLength={maxLength}
							aria-describedby={hint ? hintId : undefined}
							autoComplete="off"
						/>
						<button
							type="button"
							className="collapse"
							aria-label={collapseLabel}
							aria-expanded="true"
							aria-controls={inputId}
							onClick={fold}
						>
							<ExpandMoreIcon aria-hidden="true" />
						</button>
					</div>
					{hint ? (
						<p id={hintId} className="hint">
							{hint}
						</p>
					) : null}
				</div>
			) : (
				<button
					ref={offerButton}
					type="button"
					className="offer"
					aria-expanded="false"
					onClick={open}
				>
					<span className="strip">
						{written ? null : <AddIcon aria-hidden="true" />}
						{written ? (
							<span className="text">
								{label} <span className="value">{written}</span>
							</span>
						) : (
							<span className="text">{offer}</span>
						)}
						<ExpandMoreIcon aria-hidden="true" />
					</span>
				</button>
			)}
		</Group>
	);
}
