import styled from '@emotion/styled';
import type { ReactNode } from 'react';

const ActionCard = styled.section`
	display: flex;
	justify-content: space-between;
	gap: 14px;
	align-items: flex-start;

	.action-buttons {
		display: grid;
		gap: 10px;
		width: 100%;
	}

	@media (min-width: 560px) {
		align-items: center;

		.action-buttons {
			width: auto;
		}
	}
`;

type SessionActionCardProps = {
	title?: string;
	description: string;
	children: ReactNode;
};

export function SessionActionCard({ title, description, children }: SessionActionCardProps) {
	return (
		<ActionCard className="admin-section action-card">
			<div>
				{title ? <h2>{title}</h2> : null}
				<p>{description}</p>
			</div>
			<div className="action-buttons">{children}</div>
		</ActionCard>
	);
}
