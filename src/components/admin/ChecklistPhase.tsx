import styled from '@emotion/styled';
import { useId, type ReactNode } from 'react';

const Phase = styled.section`
	display: grid;
	gap: 8px;
	padding-top: 14px;
	border-top: 1px solid var(--color-divider);

	.heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
	}

	h3 {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0;
		color: var(--color-brand-dark);
		font-family: var(--font-heading);
		font-size: 18px;
	}

	.letter {
		display: grid;
		flex: none;
		width: 24px;
		height: 24px;
		box-sizing: border-box;
		place-items: center;
		border: 2px solid var(--color-brand);
		border-radius: 50%;
		color: var(--color-brand);
		font-family: var(--font-body);
		font-size: 13px;
		font-weight: 700;
	}
`;

export type ChecklistPhaseProps = {
	/** Its place within the station: A, B, C. */
	letter: string;
	title: string;
	/** Beside the heading: a status. */
	aside?: ReactNode;
	children: ReactNode;
};

/** A run of steps within a station that belong together, done in order with the others. */
export function ChecklistPhase({ letter, title, aside, children }: ChecklistPhaseProps) {
	const headingId = useId();

	return (
		<Phase aria-labelledby={headingId}>
			<div className="heading">
				<h3 id={headingId}>
					<span className="letter" aria-hidden="true">
						{letter}
					</span>
					{title}
				</h3>
				{aside}
			</div>
			{children}
		</Phase>
	);
}
