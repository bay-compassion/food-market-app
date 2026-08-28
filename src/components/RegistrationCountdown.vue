<script setup lang="ts">
import { computed } from 'vue';

import { useTranslation } from '@/stores/hooks/use-translation.ts';

const props = withDefaults(
	defineProps<{
		/** Ticked by the container so every display on the page shares one clock. */
		now: number;
		closesAt: Date;
		/** Remaining time at or below this starts blending the clock toward the danger color. */
		transitionThresholdMs?: number;
	}>(),
	{
		transitionThresholdMs: 5 * 60_000,
	},
);

const t = useTranslation();

function pad(value: number) {
	return String(value).padStart(2, '0');
}

const remainingMs = computed(() => props.closesAt.valueOf() - props.now);
/**
 * How far into the color transition the clock is: `0` at (or above) `transitionThresholdMs`
 * remaining, `1` at zero remaining. The template feeds this to `color-mix()` as a CSS custom
 * property, so the background is computed by CSS rather than snapped between fixed swatches.
 */
const progress = computed(() =>
	Math.min(1, Math.max(0, 1 - remainingMs.value / props.transitionThresholdMs)),
);
/**
 * `mm:ss`, the common case for a registration window. The `HH:` segment is included only once
 * there is a full hour or more left, rather than dropped by a fixed cutoff — so the format always
 * reflects the actual remaining time instead of an assumption about how long windows usually run.
 */
const display = computed(() => {
	const totalSeconds = Math.floor(remainingMs.value / 1_000);
	const hours = Math.floor(totalSeconds / 3_600);
	const minutes = Math.floor((totalSeconds % 3_600) / 60);
	const seconds = totalSeconds % 60;

	return hours > 0
		? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
		: `${pad(minutes)}:${pad(seconds)}`;
});
/**
 * A screen reader announcing the clock every second would be unusable, so the accessible text is
 * kept to whole minutes — it only changes once a minute even though the visible clock ticks every
 * second (which is hidden from assistive tech below).
 */
const accessibleText = computed(() =>
	t.value.registrationClosesInMinutes.replace(
		'{minutes}',
		String(Math.ceil(remainingMs.value / 60_000)),
	),
);
</script>

<template>
	<div v-if="remainingMs > 0" class="registration-countdown">
		<div
			class="registration-countdown-clock"
			:style="{ '--registration-countdown-progress': progress }"
			aria-hidden="true"
		>
			<span class="registration-countdown-label">
				<!--
					A color blend alone doesn't reliably read as "time is running out" for red-green color
					blindness, so the icon is a redundant, non-color signal for the same information —
					present once the transition has started, gone otherwise.
				-->
				<svg
					v-if="progress > 0"
					class="registration-countdown-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path d="M12 3 2 20h20L12 3Z" stroke-linejoin="round" stroke-linecap="round" />
					<path d="M12 10v4" stroke-linecap="round" />
					<path d="M12 17h.01" stroke-linecap="round" />
				</svg>
				{{ t.registrationClosesIn }}
			</span>
			<span class="registration-countdown-digits">{{ display }}</span>
		</div>
		<span class="sr-only">{{ accessibleText }}</span>
	</div>
</template>

<style scoped>
.registration-countdown {
	margin-bottom: 16px;
}
.registration-countdown-clock {
	display: grid;
	gap: 2px;
	padding: 14px 18px;
	border-radius: var(--radius-md);
	color: var(--color-on-brand);
	/* `longer hue` routes the blend around through amber rather than the shorter arc through
	   purple, so the color reads as warming up rather than shifting hue at random. */
	background: color-mix(
		in oklch longer hue,
		var(--color-brand),
		var(--color-error) calc(var(--registration-countdown-progress) * 100%)
	);
	text-align: center;
}
.registration-countdown-label {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 4px;
	font-size: 12px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	opacity: 0.85;
}
.registration-countdown-icon {
	flex: 0 0 auto;
	width: 14px;
	height: 14px;
}
.registration-countdown-digits {
	font-family: var(--font-heading);
	font-size: 38px;
	font-weight: 700;
	font-variant-numeric: tabular-nums;
	letter-spacing: 0.02em;
}
</style>
