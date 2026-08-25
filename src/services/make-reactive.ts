import { reactive } from 'vue';

/**
 * Enhances the provided class instance by making it reactive.
 * This allows the instance to track and respond to changes in real-time.
 *
 * @param {T} instance - The class instance to be made reactive.
 * @return {T} The reactive version of the provided class instance.
 */
export function makeReactive<T extends object>(instance: T): T {
	return reactive(instance) as T;
}
