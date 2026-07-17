<script setup lang="ts">
import { computed, ref } from 'vue';

type Locale = 'en' | 'es';

const locale = ref<Locale>('en');
const mode = ref<'guest' | 'admin'>('guest');
const isSubmitted = ref(false);

const translations = {
	en: {
		admin: 'Admin',
		adminDescription: 'Queue management tools are coming soon.',
		adminEyebrow: 'Market team',
		adminTitle: 'A simpler way to welcome every neighbor.',
		age: 'Age',
		ageHint: 'In years',
		backToGuest: 'Back to guest check-in',
		firstName: 'First name',
		formDescription: 'A few details help us prepare your visit.',
		formTitle: 'Tell us about you',
		guest: 'Guest',
		household: 'Number of people in your household',
		householdHint: 'Include yourself',
		lastName: 'Last name',
		language: 'Language',
		marketName: 'Bay Compassion',
		phone: 'Phone number',
		privacy: 'Your information is only used to help us serve you today.',
		submit: 'Join the queue',
		successDescription: 'We’ll let you know when it’s your turn. Thank you for being here.',
		successTitle: 'You’re in the queue!',
		welcome: 'Welcome to the community food market',
	},
	es: {
		admin: 'Administración',
		adminDescription: 'Las herramientas para gestionar la fila estarán disponibles pronto.',
		adminEyebrow: 'Equipo del mercado',
		adminTitle: 'Una forma más sencilla de recibir a cada vecino.',
		age: 'Edad',
		ageHint: 'En años',
		backToGuest: 'Volver al registro',
		firstName: 'Nombre',
		formDescription: 'Unos detalles nos ayudan a preparar su visita.',
		formTitle: 'Cuéntenos sobre usted',
		guest: 'Invitado',
		household: 'Número de personas en su hogar',
		householdHint: 'Inclúyase',
		lastName: 'Apellido',
		language: 'Idioma',
		marketName: 'Bay Compassion',
		phone: 'Número de teléfono',
		privacy: 'Su información solo se utiliza para atenderle hoy.',
		submit: 'Unirse a la fila',
		successDescription: 'Le avisaremos cuando sea su turno. Gracias por estar aquí.',
		successTitle: '¡Ya está en la fila!',
		welcome: 'Bienvenido al mercado comunitario de alimentos',
	},
} as const;

const t = computed(() => translations[locale.value]);

function submitForm() {
	isSubmitted.value = true;
}
</script>

<template>
	<main class="app-shell">
		<header class="topbar">
			<a class="brand" href="#" @click.prevent="isSubmitted = false">
				<span class="brand-mark" aria-hidden="true">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<path
							d="M12 21s-7-4.35-7-10.05C5 8.22 6.9 6.5 9.25 6.5c1.3 0 2.28.66 2.75 1.5.47-.84 1.45-1.5 2.75-1.5C17.1 6.5 19 8.22 19 10.95 19 16.65 12 21 12 21Z"
						/>
						<path d="M5 3.5c2.2-.25 3.94.48 5.14 2.06M19 3.5c-2.2-.25-3.94.48-5.14 2.06" />
					</svg>
				</span>
				<span>{{ t.marketName }}</span>
			</a>
			<div class="header-actions">
				<label class="language-picker">
					<span class="sr-only">{{ t.language }}</span>
					<select v-model="locale" :aria-label="t.language">
						<option value="en">English</option>
						<option value="es">Español</option>
					</select>
				</label>
				<button
					class="mode-button"
					type="button"
					@click="mode = mode === 'guest' ? 'admin' : 'guest'"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" />
					</svg>
					{{ mode === 'guest' ? t.admin : t.guest }}
				</button>
			</div>
		</header>

		<section v-if="mode === 'guest'" class="guest-layout">
			<div class="hero">
				<p class="eyebrow"><span></span>{{ t.marketName }}</p>
				<h1>{{ t.welcome }}</h1>
				<p class="hero-copy">
					{{
						locale === 'en'
							? 'We’re glad you’re here. Check in below and we’ll take care of the rest.'
							: 'Nos alegra que esté aquí. Regístrese abajo y nosotros nos encargaremos del resto.'
					}}
				</p>
				<div class="illustration" aria-hidden="true">
					<div class="sun"></div>
					<div class="hill hill-one"></div>
					<div class="hill hill-two"></div>
					<svg viewBox="0 0 330 210" fill="none">
						<path
							d="M28 189c42-42 79-17 111-70 30-50 67-60 105-41 25 12 41 35 61 51"
							stroke="#5f9e78"
							stroke-width="8"
							stroke-linecap="round"
						/>
						<path
							d="M47 174c7-26 21-43 39-52M94 191c3-20 10-35 25-47M240 177c-2-28-12-52-31-70"
							stroke="#29735a"
							stroke-width="5"
							stroke-linecap="round"
						/>
						<path
							d="M177 127c-12-32 3-66 28-72 7 24-4 54-28 72ZM205 144c7-31 35-50 57-43-7 25-31 43-57 43Z"
							fill="#edb952"
						/>
					</svg>
				</div>
			</div>

			<section class="checkin-card" aria-live="polite">
				<div v-if="isSubmitted" class="success-state">
					<div class="checkmark">✓</div>
					<h2>{{ t.successTitle }}</h2>
					<p>{{ t.successDescription }}</p>
					<button type="button" class="secondary-button" @click="isSubmitted = false">
						{{ t.guest }}
					</button>
				</div>
				<form v-else @submit.prevent="submitForm">
					<div class="form-heading">
						<h2>{{ t.formTitle }}</h2>
						<p>{{ t.formDescription }}</p>
					</div>
					<div class="field-grid">
						<label
							><span>{{ t.firstName }}</span
							><input required autocomplete="given-name"
						/></label>
						<label
							><span>{{ t.lastName }}</span
							><input required autocomplete="family-name"
						/></label>
					</div>
					<div class="field-grid narrow-fields">
						<label
							><span>{{ t.age }}</span
							><input
								required
								min="0"
								max="120"
								inputmode="numeric"
								type="number"
								:placeholder="t.ageHint"
						/></label>
						<label
							><span>{{ t.household }}</span
							><input
								required
								min="1"
								max="30"
								inputmode="numeric"
								type="number"
								:placeholder="t.householdHint"
						/></label>
					</div>
					<label
						><span>{{ t.phone }}</span
						><input
							required
							autocomplete="tel"
							inputmode="tel"
							type="tel"
							placeholder="(555) 123-4567"
					/></label>
					<button class="submit-button" type="submit">
						{{ t.submit }} <span aria-hidden="true">→</span>
					</button>
					<p class="privacy">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="5" y="10" width="14" height="10" rx="2" />
							<path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg
						>{{ t.privacy }}
					</p>
				</form>
			</section>
		</section>

		<section v-else class="admin-view">
			<p class="eyebrow"><span></span>{{ t.adminEyebrow }}</p>
			<h1>{{ t.adminTitle }}</h1>
			<p>{{ t.adminDescription }}</p>
			<div class="admin-preview"><span>01</span><span>02</span><span>03</span><span>04</span></div>
			<button class="secondary-button" type="button" @click="mode = 'guest'">
				{{ t.backToGuest }}
			</button>
		</section>
	</main>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');

:root {
	font-family: 'DM Sans', sans-serif;
	color: #183c31;
	background: #f8f7f2;
	font-synthesis: none;
}
* {
	box-sizing: border-box;
}
body {
	margin: 0;
	min-width: 320px;
}
button,
input,
select {
	font: inherit;
}
button {
	cursor: pointer;
}
.app-shell {
	min-height: 100vh;
	overflow: hidden;
	background: #f8f7f2;
}
.topbar {
	height: 76px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 5.5vw;
	border-bottom: 1px solid #e6e4dc;
	background: rgba(255, 255, 255, 0.72);
}
.brand {
	display: inline-flex;
	gap: 10px;
	align-items: center;
	color: #1b553f;
	font-weight: 700;
	text-decoration: none;
	letter-spacing: -0.03em;
}
.brand-mark {
	width: 30px;
	height: 30px;
	display: grid;
	place-items: center;
	color: #e5a840;
}
.brand-mark svg {
	width: 28px;
}
.header-actions {
	display: flex;
	gap: 9px;
	align-items: center;
}
.language-picker select,
.mode-button {
	color: #315a4a;
	border: 0;
	background: transparent;
	font-size: 14px;
	font-weight: 600;
}
.language-picker select {
	padding: 9px 19px 9px 7px;
}
.mode-button {
	display: inline-flex;
	align-items: center;
	gap: 7px;
	padding: 10px 13px;
	border: 1px solid #d7ded8;
	border-radius: 99px;
}
.mode-button svg {
	width: 17px;
}
.guest-layout {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(410px, 520px);
	gap: clamp(36px, 9vw, 150px);
	width: min(1150px, 89vw);
	margin: 0 auto;
	padding: clamp(56px, 8vw, 110px) 0 64px;
	align-items: center;
}
.hero {
	max-width: 520px;
}
.eyebrow {
	display: flex;
	align-items: center;
	gap: 9px;
	color: #337558;
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.11em;
	text-transform: uppercase;
}
.eyebrow span {
	display: block;
	width: 24px;
	height: 2px;
	background: #e5a840;
}
h1,
h2,
p {
	margin-top: 0;
}
h1 {
	max-width: 500px;
	margin-bottom: 20px;
	font-family: 'Playfair Display', Georgia, serif;
	font-size: clamp(42px, 4.7vw, 64px);
	line-height: 1.07;
	letter-spacing: -0.045em;
}
.hero-copy {
	max-width: 415px;
	color: #60746a;
	font-size: 17px;
	line-height: 1.6;
}
.illustration {
	position: relative;
	height: 190px;
	margin-top: 36px;
	overflow: hidden;
	border-radius: 20px;
	background: #e0eee2;
}
.illustration svg {
	position: absolute;
	z-index: 2;
	width: 100%;
	height: 100%;
}
.sun {
	position: absolute;
	top: 26px;
	right: 23%;
	width: 50px;
	height: 50px;
	border-radius: 50%;
	background: #edb952;
}
.hill {
	position: absolute;
	border-radius: 50% 50% 0 0;
}
.hill-one {
	width: 300px;
	height: 110px;
	left: -18px;
	bottom: -25px;
	background: #91c5a1;
}
.hill-two {
	width: 280px;
	height: 130px;
	right: -25px;
	bottom: -33px;
	background: #bedac0;
}
.checkin-card {
	padding: clamp(30px, 4vw, 44px);
	border: 1px solid #e2e1da;
	border-radius: 22px;
	background: #fff;
	box-shadow: 0 15px 42px rgba(30, 72, 51, 0.07);
}
.form-heading {
	margin-bottom: 28px;
}
.form-heading h2,
.success-state h2 {
	margin-bottom: 7px;
	font-size: 25px;
	letter-spacing: -0.035em;
}
.form-heading p,
.success-state p {
	color: #708079;
	font-size: 14px;
	line-height: 1.55;
}
form {
	display: grid;
	gap: 19px;
}
label {
	display: grid;
	gap: 8px;
	color: #385548;
	font-size: 13px;
	font-weight: 600;
}
input {
	width: 100%;
	height: 47px;
	padding: 0 14px;
	color: #183c31;
	border: 1px solid #d7ded8;
	border-radius: 8px;
	outline: 0;
	background: #fff;
	transition:
		border 0.2s,
		box-shadow 0.2s;
}
input::placeholder {
	color: #a7b1ab;
}
input:focus {
	border-color: #438466;
	box-shadow: 0 0 0 3px #e1f0e6;
}
.field-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 16px;
}
.narrow-fields {
	grid-template-columns: 0.65fr 1.35fr;
}
.submit-button,
.secondary-button {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 13px;
	min-height: 51px;
	border: 0;
	border-radius: 8px;
	color: #fff;
	background: #246848;
	font-weight: 700;
	box-shadow: 0 5px 12px rgba(36, 104, 72, 0.18);
	transition:
		transform 0.2s,
		background 0.2s;
}
.submit-button:hover,
.secondary-button:hover {
	background: #1a573b;
	transform: translateY(-1px);
}
.submit-button span {
	font-size: 22px;
	font-weight: 400;
}
.privacy {
	display: flex;
	align-items: flex-start;
	gap: 7px;
	margin: 1px 0 0;
	color: #89958f;
	font-size: 11px;
	line-height: 1.4;
}
.privacy svg {
	flex: 0 0 auto;
	width: 14px;
	margin-top: 1px;
}
.success-state {
	display: grid;
	min-height: 370px;
	place-content: center;
	text-align: center;
}
.checkmark {
	display: grid;
	width: 58px;
	height: 58px;
	place-self: center;
	place-items: center;
	margin-bottom: 19px;
	border-radius: 50%;
	color: #fff;
	background: #438466;
	font-size: 29px;
}
.success-state p {
	max-width: 280px;
	margin-bottom: 27px;
}
.secondary-button {
	min-width: 170px;
	justify-self: center;
	padding: 0 20px;
}
.admin-view {
	width: min(760px, 88vw);
	margin: 0 auto;
	padding: 13vh 0;
}
.admin-view h1 {
	max-width: 650px;
}
.admin-view > p:not(.eyebrow) {
	max-width: 430px;
	color: #60746a;
	font-size: 17px;
	line-height: 1.6;
}
.admin-preview {
	display: flex;
	gap: 12px;
	margin: 38px 0;
}
.admin-preview span {
	display: grid;
	width: 65px;
	height: 65px;
	place-items: center;
	border-radius: 50%;
	color: #337558;
	background: #e0eee2;
	font-weight: 700;
}
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border: 0;
}
@media (max-width: 780px) {
	.topbar {
		height: 65px;
		padding: 0 5vw;
	}
	.brand {
		font-size: 15px;
	}
	.guest-layout {
		display: block;
		width: min(100% - 36px, 560px);
		padding-top: 43px;
	}
	.hero {
		margin-bottom: 34px;
	}
	.hero-copy {
		font-size: 16px;
	}
	.illustration {
		display: none;
	}
	.checkin-card {
		padding: 27px 22px;
		border-radius: 18px;
	}
	.header-actions {
		gap: 2px;
	}
	.mode-button {
		padding: 8px 10px;
		font-size: 13px;
	}
	.language-picker select {
		max-width: 82px;
		padding-right: 0;
	}
	.admin-view {
		padding-top: 90px;
	}
}
@media (max-width: 390px) {
	.field-grid,
	.narrow-fields {
		grid-template-columns: 1fr;
		gap: 19px;
	}
	.topbar {
		padding: 0 13px;
	}
	.brand-mark {
		width: 24px;
	}
	.brand-mark svg {
		width: 25px;
	}
}
</style>
