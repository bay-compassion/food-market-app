import styled from '@emotion/styled';
import type { ReactNode } from 'react';

const OverrideCard = styled.section`
	.override-grid {
		display: grid;
		gap: 18px;
	}

	.override-grid form {
		margin-top: 0;
		padding: 16px;
		border-radius: var(--radius-md);
		background: #f3f6f4;
	}

	.standalone-action {
		display: flex;
		justify-content: flex-end;
		margin-top: 18px;
		padding-top: 18px;
		border-top: 1px solid #dce3df;
	}

	@media (min-width: 560px) {
		.override-grid {
			grid-template-columns: 1fr 1fr;
		}
	}
`;

type SessionOverrideCardProps = {
	title: string;
	description: ReactNode;
	action: ReactNode;
	children: ReactNode;
};

export function SessionOverrideCard({
	title,
	description,
	action,
	children,
}: SessionOverrideCardProps) {
	return (
		<OverrideCard className="admin-section settings-card">
			<h2>{title}</h2>
			<p>{description}</p>
			<div className="override-grid">{children}</div>
			<div className="standalone-action">{action}</div>
		</OverrideCard>
	);
}
