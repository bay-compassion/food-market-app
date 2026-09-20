/**
 * The screens a guest's phone can be showing, and the color that stands for each.
 *
 * One table feeds both the flowchart on the "Guest States" page and the pip beside each section's
 * heading, so a color can only mean one thing and cannot drift between the two. A state here is a
 * screen with its own card. A moment that has no screen of its own — the lottery being drawn,
 * registration closing on a guest who has already registered — is an arrow in the chart, not a node.
 */
export const guestStates = {
	marketClosed: { label: 'Market Closed', color: '#64748b' },
	registrationOpen: { label: 'Registration Open', color: '#2563eb' },
	registered: { label: 'Registered', color: '#7c3aed' },
	waiting: { label: 'Waiting', color: '#ca8a04' },
	called: { label: 'Called', color: '#16a34a' },
	served: { label: 'Served', color: '#0f766e' },
	notSelected: { label: 'Not Selected', color: '#db2777' },
	noShow: { label: 'No Show', color: '#ea580c' },
	cancelled: { label: 'Cancelled', color: '#b91c1c' },
	registrationClosed: { label: 'Registration Closed', color: '#0891b2' },
	marketUnderway: { label: 'Market Underway', color: '#92400e' },
} as const satisfies Record<string, { label: string; color: string }>;

export type GuestStateKey = keyof typeof guestStates;

/** A state changes to another because of something a guest or a worker did, or because time passed. */
type Transition = { from: GuestStateKey | GuestStateKey[]; to: GuestStateKey; when: string };

/**
 * How a guest moves between screens, from `docs/user-journey.md`.
 *
 * A guest can give up their place only while they are Registered or Waiting — a called guest cannot
 * — and a No Show can be returned to the line by a worker until the market closes.
 */
export const guestTransitions: readonly Transition[] = [
	{ from: 'marketClosed', to: 'registrationOpen', when: 'registration opens' },
	{ from: 'registrationOpen', to: 'registered', when: 'registers' },
	{ from: 'registrationOpen', to: 'registrationClosed', when: 'window closes first' },
	{ from: 'registrationClosed', to: 'marketUnderway', when: 'service starts' },
	{ from: 'registered', to: 'waiting', when: 'lottery: selected' },
	{ from: 'registered', to: 'notSelected', when: 'lottery: not selected' },
	{ from: ['registered', 'waiting'], to: 'cancelled', when: 'gives up their place' },
	{ from: 'waiting', to: 'called', when: 'worker calls' },
	{ from: 'called', to: 'served', when: 'worker serves' },
	{ from: ['waiting', 'called'], to: 'noShow', when: 'not there' },
	{ from: 'noShow', to: 'waiting', when: 'worker returns to line' },
	{ from: 'cancelled', to: 'registrationOpen', when: 'registration still open' },
	{
		from: ['served', 'notSelected', 'noShow', 'cancelled', 'registrationClosed', 'marketUnderway'],
		to: 'marketClosed',
		when: 'market closes',
	},
];

/** A pale version of a color, for a node's fill: the state's own color is kept for its outline. */
function tint(hex: string, toward = 0.86): string {
	const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));

	return `#${channels
		.map((channel) =>
			Math.round(channel + (255 - channel) * toward)
				.toString(16)
				.padStart(2, '0'),
		)
		.join('')}`;
}

function nodeOf(key: GuestStateKey): string {
	const { label } = guestStates[key];

	// Rounded ends mark where a guest's day starts and stops; everything between is a card.
	return key === 'marketClosed' ? `${key}(["${label}"])` : `${key}["${label}"]`;
}

/**
 * Where the day ends. It is the same screen as Market Closed, which is where a guest started, but
 * drawn a second time at the foot of the chart: a market closing is an arrow from six states, and
 * pointing each one back up to a box at the top turns the chart into a tangle.
 */
const endOfDay = 'marketClosedEnd';

/**
 * The flowchart, as Mermaid text. Every state is a node in its own color and every transition an
 * arrow between two of them, so a state added to the table appears in the chart by being wired in.
 */
export function guestStateFlowchart(): string {
	const keys = Object.keys(guestStates) as GuestStateKey[];
	const edges = guestTransitions.map(({ from, to, when }) => {
		const sources = (Array.isArray(from) ? from : [from]).join(' & ');

		return `${sources} -->|"${when}"| ${to === 'marketClosed' ? endOfDay : to}`;
	});
	const styles = [
		...keys.map((key) => [key, key] as const),
		[endOfDay, 'marketClosed'] as const,
	].map(([node, key]) => {
		const { color } = guestStates[key];

		return `style ${node} fill:${tint(color)},stroke:${color},stroke-width:2.5px,color:#1f2933`;
	});

	return [
		'flowchart TD',
		...keys.map(nodeOf),
		`${endOfDay}(["${guestStates.marketClosed.label}"])`,
		...edges,
		...styles,
	].join('\n');
}
