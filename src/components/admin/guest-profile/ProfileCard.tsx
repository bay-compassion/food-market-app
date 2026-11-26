import styled from '@emotion/styled';

/** A section of a guest's profile: a titled card, as every part of the Overview is. */
export const ProfileCard = styled.section`
	display: grid;
	gap: 12px;
	padding: 16px;
	border: 1.5px solid var(--color-border-soft);
	border-radius: var(--radius-md);
	background: var(--color-surface);

	> header {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: baseline;
		gap: 4px 12px;
	}

	h3 {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 18px;
		font-weight: 700;
	}

	.subtle {
		margin: 0;
		color: var(--color-text-subtle);
		font-size: 13px;
	}
`;
