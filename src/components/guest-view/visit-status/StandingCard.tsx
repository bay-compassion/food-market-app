import styled from '@emotion/styled';

/**
 * The rounded card a guest's number board sits at the top of, with whatever the line position
 * indicator puts under it — the same on the waiting and the called card. The board's colour runs to
 * the card's edge; `overflow` keeps it inside the rounded corners.
 */
export const StandingCard = styled.div`
	display: flex;
	flex-direction: column;
	margin-bottom: 27px;
	border-radius: var(--radius-md);
	overflow: hidden;
	background: var(--color-surface-soft);
`;
