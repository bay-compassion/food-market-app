<script setup lang="ts">
import { computed, ref, useId } from 'vue';

import { parseNumericInput } from '../services/numericInput';

/**
 * An A/B alternative to `CountField` for the same small-count fields.
 *
 * Instead of always showing the overflow number field next to the quick-select buttons, the
 * buttons collapse into a single "<n" button the moment the number field is focused, and expand
 * back the moment it gives up a value the buttons can't represent. Focusing it never fills it with
 * whatever button was already active — it stays blank with an "enter a value" placeholder, and if
 * it's left that way, blurring collapses back onto that same still-active button rather than
 * clearing anything. Going back the other way — clicking "<n" once a value the buttons don't offer
 * has actually been typed — doesn't discard it either: it lands on the greatest button instead, the
 * closest the buttons can represent. The number field itself is never removed from the DOM — only
 * the buttons are — so it never loses focus across the swap.
 *
 * Because the number field only ever needs to hold a value the buttons don't offer, its own `min`
 * is pinned to the first value past the buttons rather than taking a `min` prop: the buttons
 * already cover everything below that.
 *
 * `required` doesn't live on that number field, though — a browser anchors its "please fill out
 * this field" bubble to whichever control actually carries the constraint, and anchoring it to a
 * field that's sometimes a 58px-wide button lookalike reads as pointing at the wrong thing. It
 * lives instead on an invisible proxy input spanning the whole control, mirroring `modelValue`
 * directly, so the bubble appears against the field as a whole.
 */
const props = withDefaults(
	defineProps<{
		label: string;
		modelValue: number | string;
		/** The quick-select counts shown as buttons, in order. */
		options?: number[];
		required?: boolean;
		max?: number;
		/** Accessible name for the number field, since it has no visible label of its own. */
		otherLabel: string;
		/** Placeholder shown once the number field is focused and doesn't hold a value yet. Distinct
		 *  from the collapsed "n+" placeholder, which stays a plain boundary number. */
		otherPlaceholder: string;
		/** Accessible name for the button that collapses the number field back into buttons. */
		backLabel: string;
		/** Optional helper text shown under the label, e.g. clarifying what to include in the count. */
		hint?: string;
	}>(),
	{ options: () => [0, 1, 2, 3], required: false },
);

const emit = defineEmits<{ 'update:modelValue': [value: number | string] }>();

const labelId = useId();
const focused = ref(false);

/** What the number field shows while it's focused: seeded from the current value on focus (blank
 *  unless that value is already custom), then driven purely by what's typed from there. Reading
 *  straight from `modelValue` while typing would work most of the time, but the moment a partial
 *  entry matches a button — typing "1" on the way to "12" — it's classified as non-custom for that
 *  one keystroke and the field would flash blank. */
const draftValue = ref('');

const buttonSize = 58;
const buttonGap = 8;

/** Matches `.count-option`'s own width — the size the grid column settles at once it's down to
 *  showing just the "<n" button. */
const backWidth = `${buttonSize}px`;

/** How wide the button row is, so the grid column holding it can animate down to `backWidth`
 *  instead of jumping straight there. Assumes buttons stay one or two digits wide, which holds for
 *  every count this field is used for. */
const buttonsWidth = computed(
	() => `${props.options.length * buttonSize + (props.options.length - 1) * buttonGap}px`,
);

/** The first value the buttons don't offer — what the number field is for. */
const boundary = computed(() => Math.max(...props.options) + 1);

const isCustomValue = computed(
	() => props.modelValue !== '' && !props.options.includes(Number(props.modelValue)),
);

/** Whether the number field, not the buttons, is currently how the count is being set. */
const showExpanded = computed(() => focused.value || isCustomValue.value);

/** What the number field actually displays: `draftValue` while it's the one being typed into,
 *  otherwise whatever `modelValue` is, as long as the buttons can't already show it. */
const displayValue = computed(() => {
	if (focused.value) {
		return draftValue.value;
	}

	return isCustomValue.value ? props.modelValue : '';
});

function isActive(option: number) {
	return props.modelValue !== '' && Number(props.modelValue) === option;
}

function selectOption(option: number) {
	emit('update:modelValue', option);
}

function onFocus() {
	focused.value = true;
	draftValue.value = isCustomValue.value ? String(props.modelValue) : '';
}

function onOtherInput(event: Event) {
	const value = (event.target as HTMLInputElement).value;

	draftValue.value = value;
	emit('update:modelValue', parseNumericInput(value));
}

/** Blurring the number field (which a click on this button does first) already drops
 *  `showExpanded` back to the buttons when the value is one they can show as active. A custom
 *  value has no button to land on, so going back lands it on the greatest one instead — the
 *  closest the buttons can get to what was typed. */
function onBack() {
	if (isCustomValue.value) {
		emit('update:modelValue', boundary.value - 1);
	}
}
</script>

<template>
	<div class="count-field">
		<span :id="labelId">{{ label }}</span>
		<p v-if="hint" class="count-hint">{{ hint }}</p>
		<div
			class="count-options"
			:class="{ expanded: showExpanded }"
			role="group"
			:aria-labelledby="labelId"
		>
			<div class="count-buttons">
				<template v-if="!showExpanded">
					<button
						v-for="option in options"
						:key="option"
						type="button"
						class="count-option"
						:class="{ active: isActive(option) }"
						:aria-pressed="isActive(option)"
						@click="selectOption(option)"
					>
						{{ option }}
					</button>
				</template>
				<button
					v-else
					type="button"
					class="count-option count-back"
					:aria-label="backLabel"
					@click="onBack"
				>
					&lt;{{ boundary }}
				</button>
			</div>
			<input
				class="count-option count-other"
				type="number"
				:aria-label="otherLabel"
				:value="displayValue"
				:min="boundary"
				:max="max"
				inputmode="numeric"
				:placeholder="showExpanded ? otherPlaceholder : `${boundary}+`"
				@input="onOtherInput"
				@focus="onFocus"
				@blur="focused = false"
			/>
			<!-- Carries `required` so the browser's validation bubble anchors to the whole control
			     rather than whichever narrow shape the real input happens to be. `opacity: 0` keeps it
			     rendered and focusable — `display: none`/`visibility: hidden` would make Chrome treat it
			     as unfocusable and block submission with no visible message at all. -->
			<input
				class="count-validity-anchor"
				type="text"
				tabindex="-1"
				:aria-label="label"
				:value="modelValue"
				:required="required"
			/>
		</div>
	</div>
</template>

<style scoped>
.count-field {
	display: grid;
	gap: 8px;
	color: var(--color-text);
}
.count-field > span {
	font-family: var(--font-heading);
	font-size: 16px;
	font-weight: 700;
}
.count-hint {
	margin: -4px 0 0;
	color: var(--color-text-muted);
	font-size: 14px;
	line-height: 1.5;
}
.count-options {
	position: relative;
	display: grid;
	grid-template-columns: v-bind(buttonsWidth) 1fr;
	gap: 8px;
	transition: grid-template-columns 0.32s ease;
}
.count-options.expanded {
	grid-template-columns: v-bind(backWidth) 1fr;
}
.count-validity-anchor {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	opacity: 0;
	pointer-events: none;
}
.count-buttons {
	display: flex;
	gap: 8px;
	overflow: hidden;
}
.count-option {
	height: 58px;
	min-width: 58px;
	padding: 0 12px;
	color: var(--color-text);
	font-family: var(--font-body);
	font-size: 16px;
	font-weight: 700;
	text-align: center;
	border: 2px solid var(--color-border);
	border-radius: var(--radius-md);
	outline: 0;
	background: var(--color-background);
}
button.count-option.active {
	color: var(--color-on-brand);
	border-color: var(--color-brand);
	background: var(--color-brand);
}
.count-other {
	min-width: 0;
	font-weight: 400;
}
.count-other::placeholder {
	color: var(--color-placeholder);
}
</style>
