import styled from '@emotion/styled';
import type { ReactNode } from 'react';

const Section = styled.section`
	padding: 32px 22px;
	border: 2px solid var(--color-brand);
	border-radius: var(--radius-lg);
	background: var(--color-background);

	& + & {
		margin-bottom: 24px;
	}
`;

/** The bordered panel a guest screen sits inside. */
export function Card({
	children,
	...rest
}: { children: ReactNode } & React.HTMLAttributes<HTMLElement>) {
	return (
		<Section className="card" {...rest}>
			{children}
		</Section>
	);
}
