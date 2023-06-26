import { assertEquals } from 'std/testing/asserts.ts';
import constants from 'logos/src/constants.ts';
import {
	BulletStyles,
	capitalise,
	code,
	codeMultiline,
	list,
	mention,
	MentionTypes,
	timestamp,
} from 'logos/src/formatting.ts';

Deno.test('formatting', async (test) => {
	await test.step('capitalisation', async (test) => {
		await test.step('empty string', () => {
			const result = capitalise('');
			assertEquals(result, '');
		});

		await test.step('string', () => {
			const result = capitalise('magic');
			assertEquals(result, 'Magic');
		});
	});

	await test.step('code block', async (test) => {
		await test.step('string', () => {
			const result = code('code');
			assertEquals(result, '`code`');
		});
	});

	await test.step('multiline code block', async (test) => {
		await test.step('string', () => {
			const result = codeMultiline('code');
			assertEquals(result, '```code```');
		});
	});

	await test.step('list', async (test) => {
		await test.step('empty array', () => {
			const result = list([]);
			assertEquals(result, '');
		});

		await test.step('array', () => {
			const result = list(['one', 'two', 'three']);
			assertEquals(
				result,
				`${constants.symbols.bullets.arrow} one
${constants.symbols.bullets.arrow} two
${constants.symbols.bullets.arrow} three`,
			);
		});

		await test.step('bullet style', () => {
			const result = list(['one', 'two', 'three'], BulletStyles.Diamond);
			assertEquals(
				result,
				`${constants.symbols.bullets.diamond} one
${constants.symbols.bullets.diamond} two
${constants.symbols.bullets.diamond} three`,
			);
		});
	});

	await test.step('display time', async (test) => {
		await test.step('timestamp', () => {
			const result = timestamp(1640995200);
			assertEquals(result, '<t:1640995:R>');
		});
	});

	await test.step('mention', async (test) => {
		await test.step('channel', () => {
			const result = mention(432173041183752193n, MentionTypes.Channel);
			assertEquals(result, '<#432173041183752193>');
		});

		await test.step('role', () => {
			const result = mention(432175772623437825n, MentionTypes.Role);
			assertEquals(result, '<@&432175772623437825>');
		});

		await test.step('user', () => {
			const result = mention(902895279236333590n, MentionTypes.User);
			assertEquals(result, '<@902895279236333590>');
		});
	});
});
