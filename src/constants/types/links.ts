export default {
	typescriptWebsite: "https://www.typescriptlang.org/",
	nodeWebsite: "https://nodejs.org/en",
	discordApiWebsite: "https://discord.com/developers/docs/intro",
	discordenoRepository: "https://github.com/discordeno/discordeno",
	learnArmenianListingWebsite: "https://discord.me/learnarmenian",
	learnRomanianListingWebsite: "https://discord.me/learnromanian",
	talonRepositoryLink: "https://github.com/vxern/talon",
	generateLanguageRepositoryLink: (language: string) => `https://github.com/vxern/${language.toLowerCase()}`,
	generateDiscordInviteLink: (inviteCode: string) => `https://discord.gg/${inviteCode}`,
	generateTatoebaSentenceLink: (sentenceId: string) => `https://tatoeba.org/en/sentences/show/${sentenceId}`,
	generateDexonlineDefinitionLink: (lemma: string) => `https://dexonline.ro/definitie/${lemma}`,
	generateWiktionaryDefinitionLink: (lemma: string, language: string) =>
		`https://en.wiktionary.org/wiki/${lemma}#${language}`,
	wordsAPILink: "https://wordsapi.com/",
	generateDicolinkDefinitionLink: (lemma: string) => `https://dicolink.com/mots/${lemma}`,
};
