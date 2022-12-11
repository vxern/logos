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

const emojis = {
	typescript: '<:TypeScript:1034795288185024592>',
	deno: '<:Deno:1034795684852932729>',
	discordeno: '<:Discordeno:1034795720315777086>',
};

const deepLApiBaseLink = 'https://api-free.deepl.com/v2';
const deepLApiEndpoints = {
	languages: `${deepLApiBaseLink}/languages`,
	translate: `${deepLApiBaseLink}/translate`,
};

export { deepLApiEndpoints, emojis, links, Periods, staticComponentIds, timeDescriptors };
