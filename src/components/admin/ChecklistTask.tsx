import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useId, type ReactNode } from 'react';

import type { ChecklistStepCopy } from '../../adminLocales';
import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';

const Task = styled.li`
	display: grid;
	grid-template-columns: 28px minmax(0, 1fr);
	gap: 8px 12px;
	padding: 12px 0;
	border-top: 1px solid var(--color-divider);

	&:first-of-type {
		border-top: 0;
	}

	label {
		display: grid;
		grid-column: 1 / -1;
		/* The task's own columns, repeated: subgrid needs a newer Safari than guests' floor. */
		grid-template-columns: 28px minmax(0, 1fr);
		gap: 12px;
		/* The shared stylesheets set form labels in the heading face; a step reads as body text. */
		font-family: var(--font-body);
		font-weight: 400;
		cursor: pointer;
	}

	/* The box is drawn over the real checkbox, which stays focusable and is what is announced. */
	.box {
		position: relative;
		width: 28px;
		height: 28px;
	}

	input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		opacity: 0;
		cursor: inherit;
	}

	.mark {
		display: grid;
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		place-items: center;
		border: 2px solid var(--color-border);
		border-radius: 50%;
		color: transparent;
		background: var(--color-surface);
		pointer-events: none;
	}

	input:checked + .mark {
		border-color: var(--color-success);
		color: var(--color-surface);
		background: var(--color-success);
	}

	input:disabled + .mark {
		border-style: dashed;
		opacity: 0.6;
	}

	input:focus-visible + .mark {
		outline: 3px solid var(--color-focus);
		outline-offset: 2px;
	}

	.text {
		display: grid;
		gap: 2px;
		padding-top: 3px;
	}

	.title {
		font-size: 16px;
		font-weight: 500;
		line-height: 1.35;
	}

	.detail,
	.automatic {
		color: var(--color-text-subtle);
		font-size: 14px;
		line-height: 1.45;
	}

	.automatic {
		font-size: 13px;
		font-weight: 700;
	}

	&[data-ticked='true'] .title {
		color: var(--color-text-subtle);
		text-decoration: line-through;
	}

	/* What a step needs besides its words: an address, a command, a button. Outside the label, so
	   using a control there never ticks the step. */
	.extra {
		grid-column: 2;
		display: grid;
		gap: 10px;
		justify-items: start;
		min-width: 0;
	}
`;

export type ChecklistTaskProps = {
	step: ChecklistStepCopy;
	children?: ReactNode;
};

/**
 * One step a worker ticks off, with whatever it needs to be done — an address, a command — under
 * it. A step the app ticks for itself can't be ticked by hand, and nothing can be ticked until
 * there is a session for the ticks to belong to.
 */
export const ChecklistTask = observer(function ChecklistTask({
	step,
	children,
}: ChecklistTaskProps) {
	const t = adminTranslations.en.checklist;
	const { checklist } = useRootStore();
	const titleId = useId();
	const detailId = useId();
	const ticked = checklist.isTicked(step.id);
	const automatic = checklist.isAutomatic(step.id);

	return (
		<Task data-ticked={ticked}>
			<label>
				<span className="box">
					<input
						type="checkbox"
						checked={ticked}
						disabled={automatic || !checklist.canTick}
						aria-labelledby={titleId}
						aria-describedby={step.detail ? detailId : undefined}
						onChange={() => checklist.toggle(step.id)}
					/>
					<span className="mark" aria-hidden="true">
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="3"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="m5 12.5 4.5 4.5 9.5-10" />
						</svg>
					</span>
				</span>
				<span className="text">
					<span className="title" id={titleId}>
						{step.title}
					</span>
					{step.detail ? (
						<span className="detail" id={detailId}>
							{step.detail}
						</span>
					) : null}
					{automatic ? <span className="automatic">{t.automatic}</span> : null}
				</span>
			</label>
			{children ? <div className="extra">{children}</div> : null}
		</Task>
	);
});
