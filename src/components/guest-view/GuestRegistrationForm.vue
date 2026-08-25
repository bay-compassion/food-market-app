<script setup lang="ts">
import { computed } from 'vue';

import type { Translation } from '../../locales';
import { ageRanges } from '../../services/ageRanges';
import AppButton from '../AppButton.vue';
import CollapsingCountField from '../CollapsingCountField.vue';
import FormField from '../FormField.vue';
import PhoneField from '../PhoneField.vue';
import RegistrationCountdown from '../RegistrationCountdown.vue';
import type { GuestFormState } from '../types';

const props = defineProps<{
	t: Translation;
	/** Which flow this instance represents — changes the copy shown for the form, since "join the
	 *  queue" doesn't make sense for a guest signing up ahead of time. */
	context: 'queue' | 'early';
	registrationQuestions: {
		id: string;
		prompt: string;
		type: 'text' | 'scale';
		required: boolean;
	}[];
	submissionError: string;
	isSubmitting: boolean;
	/** Ticked by the container so the countdown stays live; unused unless `registrationClosesAt` is set. */
	now: number;
	/** When registration is genuinely open right now, the moment it closes; otherwise `null`. */
	registrationClosesAt: Date | null;
}>();

const emit = defineEmits<{ submit: [] }>();

const guest = defineModel<GuestFormState>('guest', { required: true });
const pin = defineModel<string>('pin', { required: true });
const pinConfirmation = defineModel<string>('pinConfirmation', { required: true });
const registrationType = defineModel<'new' | 'returning'>('registrationType', { required: true });
const updateProfile = defineModel<boolean>('updateProfile', { required: true });
const registrationAnswers = defineModel<Record<string, string | number>>('registrationAnswers', {
	required: true,
});

const ageRangeLabels = computed<Record<(typeof ageRanges)[number], string>>(() => ({
	'0-17': props.t.ageRange0to17,
	'18-29': props.t.ageRange18to29,
	'30-44': props.t.ageRange30to44,
	'45-59': props.t.ageRange45to59,
	'60-74': props.t.ageRange60to74,
	'75+': props.t.ageRange75plus,
}));

/** The strings that differ between joining today's queue and signing up ahead of time. */
const copy = computed(() =>
	props.context === 'early'
		? {
				formTitle: props.t.earlyFormTitle,
				formDescription: props.t.earlyFormDescription,
				submit: props.t.earlySubmit,
				submitting: props.t.earlySubmitting,
			}
		: {
				formTitle: props.t.formTitle,
				formDescription: props.t.formDescription,
				submit: props.t.submit,
				submitting: props.t.submitting,
			},
);
</script>

<template>
	<form @submit.prevent="emit('submit')">
		<div class="form-heading">
			<RegistrationCountdown
				v-if="context === 'queue' && registrationClosesAt"
				:t="t"
				:now="now"
				:closes-at="registrationClosesAt"
			/>
			<h2>{{ copy.formTitle }}</h2>
			<p>{{ copy.formDescription }}</p>
		</div>
		<div class="registration-type" role="group" :aria-label="t.registrationType">
			<button
				type="button"
				:class="{ active: registrationType === 'new' }"
				:aria-pressed="registrationType === 'new'"
				@click="registrationType = 'new'"
			>
				{{ t.newGuest }}
			</button>
			<button
				type="button"
				:class="{ active: registrationType === 'returning' }"
				:aria-pressed="registrationType === 'returning'"
				@click="registrationType = 'returning'"
			>
				{{ t.returningGuest }}
			</button>
		</div>
		<p v-if="registrationType === 'returning'" class="form-help">
			{{ t.returningGuestHelp }}
		</p>
		<template v-if="registrationType === 'new' || updateProfile">
			<FormField
				v-model="guest.firstName"
				:label="t.firstName"
				required
				autocomplete="given-name"
			/>
			<FormField v-model="guest.lastName" :label="t.lastName" required autocomplete="family-name" />
			<FormField v-model="guest.ageRange" :label="t.age" type="select" required>
				<option value="" disabled>{{ t.agePlaceholder }}</option>
				<option v-for="range in ageRanges" :key="range" :value="range">
					{{ ageRangeLabels[range] }}
				</option>
			</FormField>
			<CollapsingCountField
				v-model="guest.householdSize"
				:label="t.household"
				:hint="t.householdHint"
				:options="[1, 2, 3, 4]"
				required
				:max="30"
				:other-label="t.countOtherLabel"
				:other-placeholder="t.countOtherPlaceholder"
				:back-label="t.countBackLabel"
			/>
			<CollapsingCountField
				v-model="guest.childrenCount"
				:label="t.childrenCount"
				required
				:max="30"
				:other-label="t.countOtherLabel"
				:other-placeholder="t.countOtherPlaceholder"
				:back-label="t.countBackLabel"
			/>
			<CollapsingCountField
				v-model="guest.seniorsCount"
				:label="t.seniorsCount"
				required
				:max="30"
				:other-label="t.countOtherLabel"
				:other-placeholder="t.countOtherPlaceholder"
				:back-label="t.countBackLabel"
			/>
		</template>
		<PhoneField v-model="guest.phone" :label="t.phone" required />
		<FormField
			v-model="pin"
			:label="t.pin"
			type="password"
			required
			:minlength="4"
			:maxlength="8"
			inputmode="numeric"
			:placeholder="t.pinHint"
		/>
		<FormField
			v-if="registrationType === 'new'"
			v-model="pinConfirmation"
			:label="t.confirmPin"
			type="password"
			required
			:minlength="4"
			:maxlength="8"
			inputmode="numeric"
		/>
		<label v-if="registrationType === 'returning'" class="update-profile-option">
			<input v-model="updateProfile" type="checkbox" />
			<span>{{ t.updateInformation }}</span>
		</label>
		<label v-for="question in registrationQuestions" :key="question.id" class="dynamic-question">
			<span>{{ question.prompt }}</span>
			<select
				v-if="question.type === 'scale'"
				v-model.number="registrationAnswers[question.id]"
				:required="question.required"
			>
				<option value="" disabled>{{ t.chooseAnswer }}</option>
				<option v-for="value in 10" :key="value" :value="value">{{ value }}</option>
			</select>
			<textarea
				v-else
				v-model.trim="registrationAnswers[question.id]"
				:required="question.required"
				rows="3"
			></textarea>
		</label>
		<p v-if="submissionError" class="submission-error" role="alert">
			{{ submissionError }}
		</p>
		<AppButton type="submit" :disabled="isSubmitting">
			{{ isSubmitting ? copy.submitting : copy.submit }} <span aria-hidden="true">→</span>
		</AppButton>
		<p class="privacy">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="5" y="10" width="14" height="10" rx="2" />
				<path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg
			>{{ t.privacy }}
		</p>
	</form>
</template>

<style scoped>
.form-heading {
	margin-bottom: 8px;
}
.form-heading h2 {
	margin-bottom: 9px;
	font-family: var(--font-heading);
	font-size: 29px;
	letter-spacing: -0.01em;
	text-transform: uppercase;
	color: var(--color-text);
}
.form-heading p {
	color: var(--color-text-muted);
	font-size: 16px;
	line-height: 1.55;
}
form {
	display: grid;
	gap: 18px;
}
.registration-type {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
}
.registration-type button {
	min-height: 48px;
	border: 2px solid var(--color-brand);
	border-radius: var(--radius-md);
	color: var(--color-brand);
	background: var(--color-background);
	font-weight: 700;
}
.registration-type button.active {
	color: var(--color-on-brand);
	background: var(--color-brand);
}
.form-help {
	margin: 0;
	color: var(--color-text-muted);
	font-size: 14px;
	line-height: 1.5;
}
.privacy {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	margin: 0;
	color: var(--color-text-muted);
	font-size: 13px;
	line-height: 1.5;
}
.privacy svg {
	flex: 0 0 auto;
	width: 16px;
	margin-top: 1px;
}
.dynamic-question {
	display: grid;
	gap: 8px;
}
.dynamic-question > span {
	font-family: var(--font-heading);
	font-size: 16px;
	font-weight: 700;
}
.dynamic-question select,
.dynamic-question textarea {
	width: 100%;
	padding: 14px 16px;
	border: 2px solid var(--color-border);
	border-radius: var(--radius-md);
	color: var(--color-text);
	background: var(--color-background);
	font-family: var(--font-body);
	font-size: 16px;
	font-weight: 400;
}
</style>
