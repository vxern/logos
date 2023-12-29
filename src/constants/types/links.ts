import { Languages } from "../languages";

export default {
	typescriptWebsite: "https://www.typescriptlang.org/",
	nodeWebsite: "https://nodejs.org/en",
	discordApiWebsite: "https://discord.com/developers/docs/intro",
	discordenoRepository: "https://github.com/discordeno/discordeno",
	learnArmenianListingWebsite: "https://discord.me/learnarmenian",
	learnRomanianListingWebsite: "https://discord.me/learnromanian",
	talonRepositoryLink: "https://github.com/vxern/talon",
	generateDiscordInviteLink: (inviteCode: string) => `https://discord.gg/${inviteCode}`,
	generateTatoebaSentenceLink: (sentenceId: number) => `https://tatoeba.org/en/sentences/show/${sentenceId}`,
	generateDexonlineDefinitionLink: (lemma: string) => `https://dexonline.ro/definitie/${lemma}`,
	generateDicolinkDefinitionLink: (lemma: string) => `https://dicolink.com/mots/${lemma}`,
	generatePonsDefinitionLink: (lemma: string, languages: Languages<string>) =>
		`https://en.pons.com/translate/${languages.source}-${languages.target}/${lemma}`,
	generateWiktionaryDefinitionLink: (lemma: string, language: string) =>
		`https://en.wiktionary.org/wiki/${lemma}#${language}`,
	generateWordnikDefinitionLink: (lemma: string) => `https://wordnik.com/words/${lemma}`,
	wordsApiLink: "https://wordsapi.com/",
};
