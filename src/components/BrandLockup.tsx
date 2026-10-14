/** The closed logo beside live brand type, sized by the containing document. */
export function BrandLockup({ className = '' }: { className?: string }) {
	return (
		<span className={`brand-lockup ${className}`} role="img" aria-label="The Bay Compassion">
			<img className="brand-lockup__icon" src="/bay-compassion-icon-digital.svg" alt="" />
			<span className="brand-lockup__name" aria-hidden="true">
				<span>The Bay</span>
				<span>Compassion</span>
			</span>
		</span>
	);
}
