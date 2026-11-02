import styled from '@emotion/styled';

export const Page = styled.div`
	display: flex;
	flex-direction: column;
	gap: 20px;
	max-width: 1240px;
`;

export const Eyebrow = styled.div`
	color: var(--color-text-subtle);
	font-size: 14px;
	font-weight: 500;
`;

export const PageTitle = styled.h1`
	margin: 4px 0 6px;
	color: var(--color-brand-dark);
	font-family: var(--font-heading);
	font-size: clamp(28px, 4vw, 36px);
	font-weight: 700;
	line-height: 1.1;
	text-transform: none;
`;

export const Lede = styled.p`
	margin: 0;
	color: var(--color-text-muted);
`;

export const Card = styled.section`
	display: flex;
	flex-direction: column;
	gap: 12px;
	min-width: 0;
	padding: 20px;
	border: 1px solid var(--color-divider);
	border-radius: var(--radius-md);
	background: var(--color-surface);
`;

export const CardTitle = styled.h2`
	margin: 0;
	color: var(--color-brand-dark);
	font-family: var(--font-heading);
	font-size: 20px;
	font-weight: 700;
`;

export const CardRow = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
`;

export const Note = styled.p`
	margin: 0;
	color: var(--color-text-subtle);
	font-size: 13px;
`;

export const Columns = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(380px, 100%), 1fr));
	gap: 20px;
`;

export const StatGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	gap: 12px;
`;

export const Stat = styled.div`
	padding: 14px 16px;
	border-radius: var(--radius-md);
	background: var(--color-surface-muted);

	strong {
		display: block;
		font-family: var(--font-heading);
		font-size: 30px;
		line-height: 1.15;
	}

	span {
		color: var(--color-text-muted);
		font-size: 14px;
	}
`;

export const TableFrame = styled.div`
	overflow-x: auto;
`;

export const Table = styled.table`
	width: 100%;
	border-collapse: collapse;
	font-size: 14px;

	th {
		padding: 0 8px 6px 0;
		color: var(--color-text-subtle);
		font-size: 12px;
		font-weight: 500;
		text-align: start;
		white-space: nowrap;
	}

	td,
	tbody th {
		padding: 10px 8px 10px 0;
		border-top: 1px solid var(--color-divider);
		color: inherit;
		font-size: 14px;
		font-weight: 400;
	}

	.number {
		text-align: end;
	}
`;

export const Chip = styled.button<{ selected: boolean }>`
	min-height: 44px;
	padding: 4px 14px;
	border: ${({ selected }) =>
		selected ? '2px solid var(--color-brand)' : '1px solid var(--color-border-soft)'};
	border-radius: var(--radius-sm);
	color: var(--color-text);
	background: ${({ selected }) =>
		selected ? 'var(--color-surface-soft)' : 'var(--color-surface)'};
	font: inherit;
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
`;

export const PillButton = styled.button`
	min-height: 44px;
	padding: 0 18px;
	border: 1px solid var(--color-border);
	border-radius: var(--radius-pill);
	color: var(--color-brand-dark);
	background: var(--color-surface);
	font: inherit;
	font-size: 14px;
	font-weight: 700;
	cursor: pointer;
`;
