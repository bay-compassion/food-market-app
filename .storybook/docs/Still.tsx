import styled from '@emotion/styled';
import { useState } from 'react';

const Figure = styled.figure`
	width: 390px;
	max-width: 100%;
	margin: 0 auto;

	img {
		display: block;
		width: 100%;
		border: 1px solid #b4b4b4;
	}

	.missing {
		padding: 24px;
		border: 1px dashed #b4b4b4;
		color: #6b6b6b;
		font-size: 13px;
	}
`;

/**
 * A photograph of the running app, made by `npm run capture:stills`, for a screen a story cannot
 * show — one a guest only reaches by doing something, such as a dialog opening on top of the page.
 *
 * `id` is the still's id in `scripts/stills/still-catalog.mts`. The `review-figure` class is what
 * the print run numbers and keeps whole on a page, as it does for a story. The picture is fetched
 * relative to the page, from the folder Storybook serves the photographs out of.
 */
export function Still({ id, alt }: { id: string; alt: string }) {
	const [missing, setMissing] = useState(false);

	return (
		<Figure className="review-figure">
			{missing ? (
				<p className="missing">
					No photograph of <code>{id}</code> yet. Run <code>npm run capture:stills</code> and
					reload.
				</p>
			) : (
				<img src={`stills/${id}.png`} alt={alt} width={390} onError={() => setMissing(true)} />
			)}
		</Figure>
	);
}
