/** Spanish adaptation of the guest guide, using the app's actual Spanish control labels. */
import { translations } from '../../../../src/locales.ts';
import { lines as english } from '../narration.mjs';

export const voice = { source: 'kokoro', name: 'ef_dora', speed: 0.96, language: 'es' };

const t = translations.es;
const visit = t.guestView.visitStatus;
const texts = t.guestView.identityIndicator;
const optIn = t.guestView.notificationOptIn;
const script = {
	welcome:
		'Le damos la bienvenida a The Bay Compassion. Esta breve guía le explica cómo inscribirse y seguir su visita desde su teléfono.',
	open: 'Escanee el código del mercado para abrir la página en su teléfono. Puede inscribirse desde cualquier lugar, incluso desde casa.',
	language:
		'Elija su idioma. La aplicación lo recuerda, y puede cambiarlo en la parte superior de la pantalla cuando quiera.',
	closed: 'Si el mercado está cerrado, vuelva el sábado a las diez y media de la mañana.',
	window:
		'La inscripción permanece abierta durante quince minutos. El reloj muestra cuánto tiempo queda. No hay prisa. Inscribirse al principio no cambia sus posibilidades.',
	identity:
		'Escriba su nombre y apellido, y su número de celular. Por favor, use su nombre completo, en lugar de solo sus iniciales.',
	household:
		'Responda las preguntas sobre su hogar. Inclúyase en el total e indique para cuántos niños y personas mayores está comprando.',
	returning:
		'Si este teléfono ya le reconoce, su nombre y número de teléfono están guardados. Revise los datos de su hogar para la visita de hoy.',
	join: `Cuando termine, toque «${t.submit}».`,
	registered: `«${visit.registered.header}» confirma su inscripción. Si sale seleccionado, recibirá su número después del sorteo.`,
	texts: `Los mensajes de texto son opcionales. Para recibirlos, toque «${texts.notificationsAction}». Luego lea y acepte el consentimiento y toque «${optIn.enable}».`,
	draw: 'El sorteo se realiza a las diez y cuarenta y cinco. Esta página se actualiza sola y muestra su resultado. Todos tienen la misma oportunidad, y no todos obtienen un número.',
	notSelected: `Si dice «${visit.not_placed.header}», puede participar de nuevo el próximo sábado a las diez y media. Sentimos no poder ofrecerle un lugar hoy.`,
	number: `Si sale seleccionado, verá «${visit.waiting.header}» y su número. El número de Maya es el cuatro. Venga al mercado con el teléfono que usó para inscribirse.`,
	line: `Mantenga esta página abierta para seguir la fila. Su número permanece arriba. Debajo, «${visit.waiting.nowCallingLabel}» muestra los números que se están llamando en la mesa de registro.`,
	display:
		'La pantalla del salón muestra los mismos números. Mire su teléfono para saber cuándo es su turno, aunque la pantalla del salón avance a otros números.',
	called: `Las compras empiezan a las once y media. Cuando le llamen, su teléfono dirá «${visit.called.header}» y su número se pondrá verde.`,
	checkin:
		'Acérquese a la mesa de registro ahora. Muestre su número en el teléfono que usó para inscribirse. No aceptamos capturas de pantalla.',
	late: 'Si tarda un poco más, su número se vuelve amarillo gradualmente. Por favor, acérquese a la mesa de registro. El color le recuerda que otras personas están esperando.',
	missed: `Si su pantalla dice «${visit.no_show.header}» y todavía está aquí, hable con un miembro del equipo del mercado en la mesa de registro.`,
	finished: `Después de pasar por la mesa de registro, su teléfono dirá «${visit.served.header}». Su visita ha terminado.`,
	missedWindow:
		'Si no pudo inscribirse a tiempo, la página explica que el registro ha cerrado. Vuelva el próximo sábado a las diez y media.',
	underway:
		'Si el mercado ya está en marcha y usted todavía no ha pasado por la mesa de registro, hable con un miembro del equipo del mercado.',
	help: `¿Necesita recordar los pasos? Toque «${t.help.title}» o pregunte a cualquier voluntario. Gracias por acompañarnos.`,
};

// Keep the same scene IDs and pauses; Spanish recordings supply their own measured durations.
export const lines = english.map(({ id, pause }) => {
	if (!script[id]) {
		throw new Error(`Missing Spanish narration for ${id}`);
	}

	return { id, pause, text: script[id] };
});
