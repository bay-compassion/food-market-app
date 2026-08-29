import { AppButton as AppButtonView } from '@/components/AppButton.tsx';
import {
	CollapsingCountField as CollapsingCountFieldView,
	type CollapsingCountFieldProps,
} from '@/components/CollapsingCountField.tsx';
import { EyebrowLabel as EyebrowLabelView } from '@/components/EyebrowLabel.tsx';
import { FormField as FormFieldView, type FormFieldProps } from '@/components/FormField.tsx';
import { GuestRegistrationForm as GuestRegistrationFormView } from '@/components/guest-view/GuestRegistrationForm.tsx';
import { PhoneField as PhoneFieldView, type PhoneFieldProps } from '@/components/PhoneField.tsx';
import { RegistrationCountdown as RegistrationCountdownView } from '@/components/RegistrationCountdown.tsx';

import { reactIsland } from './react-island.ts';
import { vModelIsland } from './v-model-island.ts';

/**
 * React components already converted, wrapped once so a Vue parent can render them.
 *
 * Wrapping here rather than in each consumer means one Vue component definition per React
 * component instead of one per call site, and it keeps `reactIsland` out of files whose only
 * involvement is rendering a button. Every entry disappears as its callers become React.
 */
export const AppButton = reactIsland(AppButtonView);
export const EyebrowLabel = reactIsland(EyebrowLabelView);
export const RegistrationCountdown = reactIsland(RegistrationCountdownView);
export const GuestRegistrationForm = reactIsland(GuestRegistrationFormView);

// Form inputs are driven by `v-model` at every call site, so they go through the adapter that
// translates it to the `value`/`onChange` pair React expects.
export const CollapsingCountField = vModelIsland<number | string, CollapsingCountFieldProps>(
	CollapsingCountFieldView,
);
export const FormField = vModelIsland<string | number, FormFieldProps>(FormFieldView);
export const PhoneField = vModelIsland<string, PhoneFieldProps>(PhoneFieldView);
