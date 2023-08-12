import { LocalisationLanguage } from "./languages";

export default {
	languages: {
		"Armenian/Eastern": "languages.armenian.eastern",
		"Armenian/Western": "languages.armenian.western",
		Dutch: "languages.dutch",
		"English/American": "languages.english.american",
		"English/British": "languages.english.british",
		Finnish: "languages.finnish",
		French: "languages.french",
		German: "languages.german",
		Greek: "languages.greek",
		Hungarian: "languages.hungarian",
		"Norwegian/Bokmål": "languages.norwegian.bokmal",
		Polish: "languages.polish",
		Romanian: "languages.romanian",
		Turkish: "languages.turkish",
	} as const satisfies Record<LocalisationLanguage, string>,
};
