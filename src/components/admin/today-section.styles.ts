import styled from '@emotion/styled';

/** A titled section of the Today screen: a heading row, a line of help, then its controls. */
export const TodaySection = styled.section`
	display: grid;
	gap: 10px;

	.heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
	}

	h2 {
		margin: 0;
		color: var(--color-brand-dark);
		font-family: var(--font-heading);
		font-size: 18px;
		font-weight: 700;
		text-transform: none;
	}

	p {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 14px;
	}
`;
