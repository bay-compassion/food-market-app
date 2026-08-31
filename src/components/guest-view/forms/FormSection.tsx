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

const Legend = styled.legend`
	padding: 0;
	font-family: var(--font-heading);
	font-size: 18px;
	font-weight: 700;
	letter-spacing: 0.01em;
	text-transform: uppercase;
	color: var(--color-text);
`;

const Fields = styled.div`
	display: grid;
	gap: 18px;
	margin-top: 14px;
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
