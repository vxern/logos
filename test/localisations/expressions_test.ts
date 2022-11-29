import { assert, assertEquals } from 'std/testing/asserts.ts';
import { Expressions } from 'logos/assets/localisations/expressions.ts';

Deno.test('expressions', async (test) => {
	await test.step('pluralise', async (test) => {
		await test.step('english', async (test) => {
			const terms = ['word', 'words'] as const;

			await test.step('zero (0)', () => {
				const result = Expressions.english.methods.pluralise('0', ...terms);
				assertEquals(result, '0 words');
			});

			await test.step('singular (1)', () => {
				const result = Expressions.english.methods.pluralise('1', ...terms);
				assertEquals(result, '1 word');
			});

			await test.step('plural (2)', () => {
				const result = Expressions.english.methods.pluralise('2', ...terms);
				assertEquals(result, '2 words');
			});
		});

		await test.step('polish', async (test) => {
			const terms = ['słowo', 'słowa', 'słów'] as const;

			await test.step('zero (0)', () => {
				const result = Expressions.polish.methods.pluralise('0', ...terms);
				assertEquals(result, '0 słów');
			});

			await test.step('singular (1)', () => {
				const result = Expressions.polish.methods.pluralise('1', ...terms);
				assertEquals(result, '1 słowo');
			});

			await test.step('plural (numbers ending with 2, 3, 4 except 12, 13, 14)', () => {
				const result = ['2', '3', '4', '22', '23', '24'].map(
					(number) => Expressions.polish.methods.pluralise(number, ...terms),
				);
				assert(result.every((expression) => expression.endsWith('słowa')));
				const exceptions = ['12', '13', '14'].map((number) => Expressions.polish.methods.pluralise(number, ...terms));
				assert(exceptions.every((expression) => expression.endsWith('słów')));
			});

			await test.step('genitive (all other numbers)', () => {
				const result = ['5', '6', '7', '8', '9'].map(
					(number) => Expressions.polish.methods.pluralise(number, ...terms),
				);
				assert(result.every((expression) => expression.endsWith('słów')), '2 słów');
			});
		});

		await test.step('romanian', async (test) => {
			const terms = ['cuvânt', 'cuvinte'] as const;

			await test.step('zero (0)', () => {
				const result = Expressions.romanian.methods.pluralise('0', ...terms);
				assertEquals(result, '0 cuvinte');
			});

			await test.step('singular (1)', () => {
				const result = Expressions.romanian.methods.pluralise('1', ...terms);
				assertEquals(result, '1 cuvânt');
			});

			await test.step('plural (2)', () => {
				const result = Expressions.romanian.methods.pluralise('2', ...terms);
				assertEquals(result, '2 cuvinte');
			});

			await test.step('plural (20+)', () => {
				const result = Expressions.romanian.methods.pluralise('20', ...terms);
				assertEquals(result, '20 de cuvinte');
			});
		});
	});
});
