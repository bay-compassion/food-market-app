import styled from '@emotion/styled';

const Steps = styled.ol`
	display: grid;
	gap: 8px;
	margin: 0;
	padding-inline-start: 22px;
	color: var(--color-text-subtle);
	line-height: 1.5;
`;

/** A numbered list of plain-language instructions on the Checklist screen, in order. */
export function ChecklistSteps({ steps }: { steps: readonly string[] }) {
	return (
		<Steps>
			{steps.map((step) => (
				<li key={step}>{step}</li>
			))}
		</Steps>
	);
}
