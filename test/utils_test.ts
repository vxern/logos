import { assertEquals, assertThrows } from 'std/testing/asserts.ts';
import { addParametersToURL, chunk, fromHex, snowflakeToTimestamp } from 'logos/src/utils.ts';
import { trim } from 'logos/formatting.ts';

Deno.test('utils', async (test) => {
	await test.step('fromHex', async (test) => {
		await test.step('rgb full', () => {
			const result = fromHex('#ffffff');
			assertEquals(
				result,
				// (255 * 256^0) + (255 * 256^1) + (255 * 256^2)
				255 * Math.pow(256, 0) + 255 * Math.pow(256, 1) + 255 * Math.pow(256, 2),
			);
		});
	});

	await test.step('chunk', async (test) => {
		await test.step('empty array', () => {
			const result = chunk([], 5);
			assertEquals(result, [[]]);
		});

		await test.step('zero size', () => {
			assertThrows(() => chunk(['a', 'b', 'c'], 0), 'The size of a chunk cannot be zero.');
		});

		await test.step('one chunk incomplete', () => {
			const result = chunk(['a', 'b', 'c'], 5);
			assertEquals(result, [['a', 'b', 'c']]);
		});

		await test.step('one chunk complete', () => {
			const result = chunk(['a', 'b', 'c'], 3);
			assertEquals(result, [['a', 'b', 'c']]);
		});

		await test.step('two chunks incomplete', () => {
			const result = chunk(['a', 'b', 'c'], 2);
			assertEquals(result, [['a', 'b'], ['c']]);
		});

		await test.step('two chunks complete', () => {
			const result = chunk(['a', 'b', 'c', 'd'], 2);
			assertEquals(result, [['a', 'b'], ['c', 'd']]);
		});
	});

	await test.step('trim', async (test) => {
		await test.step('word', async (test) => {
			await test.step('shorter than limit', () => {
				const result = trim('short', 10);
				assertEquals(result, 'short');
			});

			await test.step('equal length to limit', () => {
				const result = trim('long', 4);
				assertEquals(result, 'long');
			});

			await test.step('longer than limit', () => {
				const result = trim('verylongwordhere', 15);
				assertEquals(result, 'verylongword...');
			});
		});

		await test.step('sentence', async (test) => {
			await test.step('shorter than limit', () => {
				const result = trim('This is a sample sentence.', 50);
				assertEquals(result, 'This is a sample sentence.');
			});

			await test.step('equal length to limit', () => {
				const result = trim('This is a sample sentence.', 26);
				assertEquals(result, 'This is a sample sentence.');
			});

			await test.step('longer than limit', () => {
				const result = trim('This is a sample sentence.', 15);
				assertEquals(result, 'This is a (...)');
			});
		});
	});

	await test.step('snowflakeToTimestamp', () => {
		const result = snowflakeToTimestamp(902895279236333590n);
		assertEquals(result, 1635337409553);
	});

	await test.step('addParametersToURL', async (test) => {
		await test.step('no parameters', () => {
			const result = addParametersToURL('https://website.com', {});
			assertEquals(result, 'https://website.com');
		});

		await test.step('one parameter', () => {
			const result = addParametersToURL(
				'https://website.com',
				{ 'key': 'value' },
			);
			assertEquals(result, 'https://website.com?key=value');
		});

		await test.step('two parameters', () => {
			const result = addParametersToURL(
				'https://website.com',
				{ 'key1': 'value1', 'key2': 'value2' },
			);
			assertEquals(
				result,
				'https://website.com' +
					'?key1=value1' + '&key2=value2',
			);
		});

		await test.step('more parameters', () => {
			const result = addParametersToURL(
				'https://website.com',
				{ 'key1': 'value1', 'key2': 'value2', 'key3': 'value3', 'key4': 'value4' },
			);
			assertEquals(
				result,
				'https://website.com' +
					'?key1=value1' + '&key2=value2' + '&key3=value3' + '&key4=value4',
			);
		});
	});
});
