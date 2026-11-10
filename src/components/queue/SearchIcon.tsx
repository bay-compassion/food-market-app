/** A magnifying glass, in the text colour around it. */
export function SearchIcon({ size = 22 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
			<circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
			<path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
		</svg>
	);
}
