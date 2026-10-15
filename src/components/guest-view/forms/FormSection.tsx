import styled from '@emotion/styled';
import type { ReactNode } from 'react';

const Fieldset = styled.fieldset`
	min-inline-size: 0;
	margin: 0;
	padding: 0;
	border: 0;

	& + & {
		margin-top: 4px;
		padding-top: 22px;
		border-top: 1px solid var(--color-border);
	}
`;

/*
 * Floated so it leaves the fieldset's border. A legend otherwise renders inside the top border, so
 * the divider between two sections ran through the second section's heading.
 */
const Legend = styled.legend`
	float: inline-start;
	width: 100%;

	/* On the legend, not the fields: a cleared element's top margin is lost against the float. */
	margin-bottom: 14px;
	padding: 0;
	font-family: var(--font-heading);
	font-size: 18px;
	font-weight: 700;
	letter-spacing: var(--tracking-label);
	text-transform: uppercase;
	color: var(--color-text);
`;

const Fields = styled.div`
	clear: both;
	display: grid;
	gap: 18px;
`;

type FormSectionProps = {
	legend: string;
	children: ReactNode;
};

/** A visually distinct, accessibly named group of related guest-form controls. */
export function FormSection({ legend, children }: FormSectionProps) {
	return (
		<Fieldset>
			<Legend>{legend}</Legend>
			<Fields>{children}</Fields>
		</Fieldset>
	);
}
