import { LocalisationLanguage } from "./languages";

export default {
	languages: {
		Greek: "languages.greek",
		"English/American": "languages.english.american",
		"English/British": "languages.english.british",
		Finnish: "languages.finnish",
		French: "languages.french",
		Hungarian: "languages.hungarian",
		"Norwegian/Bokmål": "languages.norwegian.bokmal",
		"Armenian/Eastern": "languages.armenian.eastern",
		"Armenian/Western": "languages.armenian.western",
		Dutch: "languages.dutch",
		Polish: "languages.polish",
		Romanian: "languages.romanian",
		Turkish: "languages.turkish",
	} as const satisfies Record<LocalisationLanguage, string>,
};
