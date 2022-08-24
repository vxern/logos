import { Language } from './types.ts';

const links = {
	typescriptWebsite: 'https://www.typescriptlang.org/',
	denoWebsite: 'https://deno.land/',
	discordApiWebsite: 'https://discord.com/developers/docs/intro',
	discordenoRepository: 'https://github.com/discordeno/discordeno',

	learnArmenianListingWebsite: 'https://discord.me/learnarmenian',
	learnRomanianListingWebsite: 'https://discord.me/learnromanian',

	talonRepositoryLink: 'https://github.com/linguition/talon',
	generateLanguageRepositoryLink: (language: Language) =>
		`https://github.com/linguition/${language}`,
};

const deepLApiBaseLink = 'https://api-free.deepl.com/v2/';
const deepLApiEndpoints = {
	languages: `${deepLApiBaseLink}languages`,
	translate: `${deepLApiBaseLink}translate`,
};

export { deepLApiEndpoints, links };
