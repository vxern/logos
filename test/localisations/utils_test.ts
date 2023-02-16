import { assertEquals } from 'std/testing/asserts.ts';
import { Locales } from 'discordeno';
import {
	createLocalisations,
	getLanguageByLocale,
	getLocaleForLanguage,
	localise,
} from 'logos/assets/localisations/utils.ts';
import { defaultLanguage } from 'logos/types.ts';

Deno.test('utils', async (test) => {
	await test.step('getLanguageByLocale', async (test) => {
		await test.step('unsupported locale', () => {
			const result = getLanguageByLocale(Locales.Thai);
			assertEquals(result, undefined);
		});

		await test.step('supported locale', () => {
			const result = getLanguageByLocale(Locales.RomanianRomania);
			assertEquals(result, 'Romanian');
		});
	});

	await test.step('getLocaleForLanguage', async (test) => {
		await test.step('unsupported language', () => {
			const result = getLocaleForLanguage('Armenian');
			assertEquals(result, 'en-GB');
		});

		await test.step('supported language', () => {
			const result = getLocaleForLanguage('Romanian');
			assertEquals(result, 'ro');
		});
	});

	await test.step('localise', async (test) => {
		await test.step('default language present and invalid locale', () => {
			const localisations = { 'English': 'ABC' };
			const result = localise(localisations, 'invalid-locale');
			assertEquals(result, localisations[defaultLanguage]);
		});

		await test.step('language not present and valid locale', () => {
			const localisations = { 'English': 'ABC' };
			const result = localise(localisations, 'pl');
			assertEquals(result, localisations[defaultLanguage]);
		});

		await test.step('language present and valid locale', () => {
			const localisations = { 'English': 'ABC', 'Polish': '123' };
			const result = localise(localisations, 'pl');
			assertEquals(result, localisations['Polish']);
		});
	});

	await test.step('createLocalisations', () => {
		const result = createLocalisations({
			name: { 'English': 'command' },
			description: { 'English': 'description' },
		});
		assertEquals(result, {
			name: 'command',
			nameLocalizations: {},
			description: 'description',
			descriptionLocalizations: {},
		});
	});
});
