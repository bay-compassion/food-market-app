<script setup lang="ts">
import { computed } from 'vue';

import type { Locale, Translation } from '../locales';
import { ageRanges } from '../services/ageRanges';
import type { VisitStatus } from '../services/visitStateMachine';
import AppButton from './AppButton.vue';
import FormField from './FormField.vue';
import NotificationOptIn from './NotificationOptIn.vue';
import type { GuestFormState } from './types';

type ActiveVisit = {
	id: string;
	status: VisitStatus;
	queuePosition: number | null;
	aheadOfYou: number | null;
};

const props = defineProps<{
	t: Translation;
	locale: Locale;
	/** Which flow this instance represents — changes the copy shown for the form and its success
	 *  state, since "join the queue" doesn't make sense for a guest signing up ahead of time. */
	context: 'queue' | 'early';
	activeVisit: ActiveVisit | null;
	isSubmitted: boolean;
	isCalled: boolean;
	visitStatusLabel: string;
	queuePosition: number | null;
	guestsAhead: number | null;
	canCancelVisit: boolean;
	isCancelling: boolean;
	visitToken: string | null;
	/** Whether the form should render at all — either registration is open, or this is a
	 *  pre-registration view for a session that allows signing up ahead of time. */
	canShowForm: boolean;
	/** Whether to offer a way to sign up early from the closed state. */
	showPreregisterCta: boolean;
	registrationQuestions: {
		id: string;
		prompt: string;
		type: 'text' | 'scale';
		required: boolean;
	}[];
	submissionError: string;
	isSubmitting: boolean;
}>();

const emit = defineEmits<{ submit: []; 'cancel-visit': []; preregister: [] }>();

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
				successTitle: props.t.earlySuccessTitle,
				successDescription: props.t.earlySuccessDescription,
			}
		: {
				formTitle: props.t.formTitle,
				formDescription: props.t.formDescription,
				submit: props.t.submit,
				submitting: props.t.submitting,
				successTitle: props.t.successTitle,
				successDescription: props.t.successDescription,
			},
);
</script>

<template>
	<section class="checkin-card" aria-live="polite">
		<div v-if="activeVisit && isSubmitted" class="success-state">
			<template v-if="isCalled">
				<div class="checkmark called-mark" aria-hidden="true">→</div>
				<h2>{{ t.calledTitle }}</h2>
				<p>{{ t.calledDescription }}</p>
			</template>
			<template v-else>
				<div class="checkmark">✓</div>
				<h2>{{ copy.successTitle }}</h2>
				<div v-if="queuePosition" class="queue-standing">
					<p class="queue-position">
						<span>{{ t.queuePositionLabel }}</span>
						<strong>{{ queuePosition }}</strong>
					</p>
					<p v-if="guestsAhead === 0" class="queue-next">{{ t.youAreNext }}</p>
					<p v-else-if="guestsAhead !== null">
						{{ t.guestsAheadOfYou }}: <strong>{{ guestsAhead }}</strong>
					</p>
				</div>
				<p v-else>
					{{ t.currentStatus }}: <strong>{{ visitStatusLabel }}</strong>
				</p>
				<p>{{ copy.successDescription }}</p>
			</template>
			<NotificationOptIn :visit-token="visitToken" :locale="locale" />
			<p v-if="submissionError" class="submission-error" role="alert">
				{{ submissionError }}
			</p>
			<AppButton
				v-if="canCancelVisit"
				type="button"
				variant="secondary"
				:disabled="isCancelling"
				@click="emit('cancel-visit')"
			>
				{{ t.cancelVisit }}
			</AppButton>
		</div>
		<div v-else-if="!canShowForm" class="closed-state">
			<div class="closed-icon" aria-hidden="true">—</div>
			<h2>{{ t.registrationClosed }}</h2>
			<p>{{ t.registrationClosedDescription }}</p>
			<a
				v-if="showPreregisterCta"
				class="preregister-cta"
				href="/signup"
				@click.prevent="emit('preregister')"
			>
				{{ t.preregisterCta }}
			</a>
		</div>
		<form v-else-if="canShowForm" @submit.prevent="emit('submit')">
			<div class="form-heading">
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
				<FormField
					v-model="guest.lastName"
					:label="t.lastName"
					required
					autocomplete="family-name"
				/>
				<FormField v-model="guest.ageRange" :label="t.age" type="select" required>
					<option value="" disabled>{{ t.agePlaceholder }}</option>
					<option v-for="range in ageRanges" :key="range" :value="range">
						{{ ageRangeLabels[range] }}
					</option>
				</FormField>
				<FormField
					v-model="guest.householdSize"
					:label="t.household"
					type="number"
					required
					:min="1"
					:max="30"
					inputmode="numeric"
					:placeholder="t.householdHint"
				/>
				<FormField
					v-model="guest.childrenCount"
					:label="t.childrenCount"
					type="number"
					required
					:min="0"
					:max="30"
					inputmode="numeric"
					:placeholder="t.childrenCountHint"
				/>
				<FormField
					v-model="guest.seniorsCount"
					:label="t.seniorsCount"
					type="number"
					required
					:min="0"
					:max="30"
					inputmode="numeric"
					:placeholder="t.seniorsCountHint"
				/>
			</template>
			<FormField
				v-model="guest.phone"
				:label="t.phone"
				required
				autocomplete="tel"
				inputmode="tel"
				type="tel"
				placeholder="(555) 123-4567"
			/>
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
	</section>
</template>

<style scoped>
.checkin-card {
	padding: 32px 22px;
	border: 2px solid var(--color-brand);
	border-radius: var(--radius-lg);
	background: var(--color-background);
}
.form-heading {
	margin-bottom: 8px;
}
.form-heading h2,
.success-state h2 {
	margin-bottom: 9px;
	font-family: var(--font-heading);
	font-size: 29px;
	letter-spacing: -0.01em;
	text-transform: uppercase;
	color: var(--color-text);
}
.form-heading p,
.success-state p {
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
.success-state {
	display: grid;
	min-height: 340px;
	place-content: center;
	text-align: center;
}
.closed-state {
	display: grid;
	min-height: 280px;
	place-content: center;
	text-align: center;
}
.closed-state h2 {
	margin-bottom: 8px;
	font-family: var(--font-heading);
	font-size: 28px;
	text-transform: uppercase;
}
.closed-state p {
	max-width: 320px;
	color: var(--color-text-muted);
	line-height: 1.55;
}
.closed-icon {
	display: grid;
	width: 54px;
	height: 54px;
	place-self: center;
	place-items: center;
	margin-bottom: 16px;
	border-radius: 50%;
	color: white;
	background: var(--color-brand);
	font-size: 28px;
}
.preregister-cta {
	margin: 12px auto 0;
	color: var(--color-brand);
	font-weight: 700;
	text-decoration: underline;
}
.dynamic-question {
	display: grid;
	gap: 8px;
	font-family: var(--font-heading);
	font-size: 14.5px;
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
}
.checkmark {
	display: grid;
	width: 58px;
	height: 58px;
	place-self: center;
	place-items: center;
	margin-bottom: 19px;
	border-radius: var(--radius-md);
	color: var(--color-on-brand);
	background: var(--color-brand);
	font-size: 29px;
}
.success-state p {
	max-width: 280px;
	margin: 0 auto 27px;
}
.called-mark {
	background: var(--color-error);
	font-size: 34px;
}
.queue-standing {
	margin-bottom: 27px;
	padding: 18px;
	border-radius: var(--radius-md);
	background: var(--color-surface-soft);
}
.queue-standing p {
	margin-bottom: 0;
}
.queue-position {
	display: grid;
	gap: 4px;
	margin-bottom: 8px;
}
.queue-position strong {
	font-family: var(--font-heading);
	font-size: 44px;
	line-height: 1;
	color: var(--color-brand);
}
.queue-next {
	font-weight: 700;
}
</style>
