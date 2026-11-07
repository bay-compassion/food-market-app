/**
 * Material's own `Remove`, `Add`, and `Clear` glyphs, inlined rather than pulling in
 * `@mui/icons-material`. Guest screens ride in the initial chunk that stands between a guest and the
 * queue, and three paths are not worth a package.
 */
export function StepGlyph({ direction }: { direction: 'up' | 'down' }) {
	return (
		<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
			<path
				fill="currentColor"
				d={direction === 'up' ? 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z' : 'M19 13H5v-2h14v2z'}
			/>
		</svg>
	);
}

export function ClearGlyph() {
	return (
		<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
			<path
				fill="currentColor"
				d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
			/>
		</svg>
	);
}
