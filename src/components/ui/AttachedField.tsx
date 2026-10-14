import { useEffect, useId, useRef, useState, type FocusEvent, type ReactNode } from 'react';

import { Group } from './attached-field.styles';
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
		if (focusTarget === null) {
			return;
		}

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
