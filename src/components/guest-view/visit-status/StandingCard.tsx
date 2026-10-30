import styled from '@emotion/styled';

/**
 * The rounded card a guest's number board sits at the top of, with whatever the line position
 * indicator puts under it — the same on the waiting and the called card. The board's colour runs to
 * the card's edge; `overflow` keeps it inside the rounded corners. Inside a status panel, which is
 * tinted already, it takes the page's ground (`--standing-card-background`) to stand out.
 */
export const StandingCard = styled.div`
	display: flex;
	flex-direction: column;
	justify-self: stretch;
	border-radius: var(--radius-md);
	overflow: hidden;
	background: var(--standing-card-background, var(--color-surface-soft));
`;
