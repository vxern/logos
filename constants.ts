import { fromHex } from 'logos/src/utils.ts';
import { Language } from 'logos/types.ts';

class Periods {
	static readonly second = 1000;
	static readonly minute = 60 * Periods.second;
	static readonly hour = 60 * Periods.minute;
	static readonly day = 24 * Periods.hour;
	static readonly week = 7 * Periods.day;
	static readonly month = 30 * Periods.day;
	static readonly year = 365 * Periods.day;
}

const timeDescriptors: [string, number][] = [
	['second', Periods.second],
	['minute', Periods.minute],
	['hour', Periods.hour],
	['day', Periods.day],
	['week', Periods.week],
	['month', Periods.month],
	['year', Periods.year],
];

const staticComponentIds = {
	acceptedRules: 'accepted_rules',
	selectedLanguageProficiency: 'selected_language_proficiency',
	requestedVerification: 'requested_verification',
	verification: 'verification',
};

const links = {
	typescriptWebsite: 'https://www.typescriptlang.org/',
	denoWebsite: 'https://deno.land/',
	discordApiWebsite: 'https://discord.com/developers/docs/intro',
	discordenoRepository: 'https://github.com/discordeno/discordeno',

	learnArmenianListingWebsite: 'https://discord.me/learnarmenian',
	learnRomanianListingWebsite: 'https://discord.me/learnromanian',

	talonRepositoryLink: 'https://github.com/linguition/talon',
	generateLanguageRepositoryLink: (language: Language) => `https://github.com/linguition/${language.toLowerCase()}`,

	generateDiscordInviteLink: (inviteCode: string) => `https://discord.gg/${inviteCode}`,
};

const images = {
	rules: 'https://i.imgur.com/wRBpXcY.png',
	inviteLink: 'https://i.imgur.com/snJaKYm.png',
};

const colors = {
	invisible: fromHex('#36393f'),
	red: fromHex('#b42f2f'),
	darkRed: fromHex('#820000'),
	lightGreen: fromHex('#89ef59'),
	darkGreen: fromHex('#479621'),
	blue: fromHex('#6269ed'),
	dullYellow: fromHex('#f2f277'),
	gray: fromHex('#637373'),
	peach: fromHex('#ff9a76'),
	husky: fromHex('#d6e3f8'),
	black: fromHex('1c1c1c'), // Eerie black
	yellow: fromHex('#ffe548'), // Gargoyle gas
	orangeRed: fromHex('#ff4b3e'), // Dusk orange
	lightGray: fromHex('#daddd8'),
	turquoise: fromHex('#68d8d6'), // Hammam blue
	green: fromHex('#00cc66'), // Alienated
	greenishLightGray: fromHex('#c5e0d8'), // Ulthuan gray
	orange: fromHex('#f28123'), // Beer
};

const emojis = {
	custom: {
		typescript: '<:TypeScript:1034795288185024592>',
		deno: '<:Deno:1034795684852932729>',
		discordeno: '<:Discordeno:1034795720315777086>',
	},
	music: {
		song: '🎵',
		external: '📁',
		collection: '🎶',
	},
};

const endpoints = {
	deepl: {
		languages: 'https://api-free.deepl.com/v2/languages',
		translate: 'https://api-free.deepl.com/v2/translate',
	},
};

export default { endpoints, links, images, colors, emojis, staticComponentIds, timeDescriptors };
export { Periods };
