import { Language } from 'logos/types.ts';

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

export { deepLApiEndpoints, emojis, links };
