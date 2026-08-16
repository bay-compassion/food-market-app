/**
 * Shapes shared between the design system specimen components and the stories that drive them.
 *
 * These live in a plain module rather than being inferred from the `.vue` files, for the same
 * reason `src/components/types.ts` exists: props declared inside `<script setup>` resolve through
 * the wildcard `*.vue` shim under `oxlint`, so `Meta<typeof TokenTable>` sees a component with no
 * props and rejects every arg. Declaring the prop bag here lets the component and its stories
 * share one definition that both tools agree on.
 */

/** A `[token, usage]` pair, for example `['--color-brand', 'Top bar and primary buttons']`. */
export type TokenEntry = [token: string, usage: string];

export type TokenTableProps = {
	tokens: TokenEntry[];
	/** Whether the sample square shows the token as a fill or as a corner radius. */
	preview: 'color' | 'radius';
};

/** One size in a type scale, with the place in the app that uses it. */
export type TypeSample = {
	size: string;
	weight: number;
	uppercase?: boolean;
	usage: string;
	text: string;
};

export type TypeScaleProps = {
	/** Which family the samples are set in. */
	token: '--font-heading' | '--font-body';
	samples: TypeSample[];
};
