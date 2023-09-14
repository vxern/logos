import { LearningLanguage, LocalisationLanguage } from "../../../../constants/languages";
import defaults from "../../../../defaults";
import { DictionaryAdapter, SearchLanguages } from "./adapter";
import dexonline from "./adapters/dexonline";
import dicolink from "./adapters/dicolink";
import wiktionary from "./adapters/wiktionary";
import wordsApi from "./adapters/words-api";

type DictionaryAdapters = DictionaryAdapter[];
type TargetDictionaryAdapters<SourceLanguage extends LocalisationLanguage> = Partial<
	Record<Exclude<LocalisationLanguage, SourceLanguage>, DictionaryAdapter[]>
>;

type AdapterGroup<SourceLanguage extends LocalisationLanguage> = {
	source?: DictionaryAdapters;
	targets?: TargetDictionaryAdapters<SourceLanguage>;
};

type AdapterCollectionLocalised<SourceLanguage extends LocalisationLanguage> = {
	primary: AdapterGroup<SourceLanguage>;
	secondary?: AdapterGroup<SourceLanguage>;
	tertiary?: AdapterGroup<SourceLanguage>;
};

type AdaptersLocalised = {
	[SourceLanguage in LearningLanguage]: AdapterCollectionLocalised<SourceLanguage>;
};

const adaptersLocalised: AdaptersLocalised = {
	"Armenian/Eastern": {
		primary: {
			targets: {
				"English/American": [wiktionary],
				"English/British": [wiktionary],
			},
		},
	},
	"Armenian/Western": {
		primary: {
			targets: {
				"English/American": [wiktionary],
				"English/British": [wiktionary],
			},
		},
	},
	Dutch: {
		primary: {
			targets: {
				"English/American": [wiktionary],
				"English/British": [wiktionary],
			},
		},
	},
	"English/American": {
		primary: {
			source: [wiktionary],
		},
		tertiary: {
			source: [wordsApi],
		},
	},
	"English/British": {
		primary: {
			source: [wiktionary],
		},
		tertiary: {
			source: [wordsApi],
		},
	},
	Finnish: {
		primary: {
			targets: {
				"English/American": [wiktionary],
				"English/British": [wiktionary],
			},
		},
	},
	French: {
		primary: {
			source: [dicolink],
			targets: {
				"English/American": [wiktionary],
				"English/British": [wiktionary],
			},
		},
	},
	German: {
		primary: {
			targets: {
				"English/American": [wiktionary],
				"English/British": [wiktionary],
			},
		},
	},
	Greek: {
		primary: {
			targets: {
				"English/American": [wiktionary],
				"English/British": [wiktionary],
			},
		},
	},
	Hungarian: {
		primary: {
			targets: {
				"English/American": [wiktionary],
				"English/British": [wiktionary],
			},
		},
	},
	"Norwegian/Bokmål": {
		primary: {
			targets: {
				"English/American": [wiktionary],
				"English/British": [wiktionary],
			},
		},
	},
	Polish: {
		primary: {
			targets: {
				"English/American": [wiktionary],
				"English/British": [wiktionary],
			},
		},
	},
	Romanian: {
		primary: {
			source: [dexonline],
			targets: {
				"English/American": [wiktionary],
				"English/British": [wiktionary],
			},
		},
	},
	Russian: {
		primary: {
			targets: {
				"English/American": [wiktionary],
				"English/British": [wiktionary],
			},
		},
	},
	Silesian: {
		primary: {
			targets: {
				"English/American": [wiktionary],
				"English/British": [wiktionary],
			},
		},
	},
	Swedish: {
		primary: {
			targets: {
				"English/American": [wiktionary],
				"English/British": [wiktionary],
			},
		},
	},
	Turkish: {
		primary: {
			targets: {
				"English/American": [wiktionary],
				"English/British": [wiktionary],
			},
		},
	},
};

type AdaptersResolved = {
	primary: DictionaryAdapter[];
	secondary: DictionaryAdapter[];
	tertiary: DictionaryAdapter[];
};

function isSearchMonolingual<SourceLanguage extends LocalisationLanguage,>(
	sourceLanguage: SourceLanguage,
	targetLanguage: LearningLanguage,
): targetLanguage is SourceLanguage {
	return sourceLanguage === targetLanguage;
}

function areAdaptersMissing(adapters: AdaptersResolved): boolean {
	return adapters.primary.length === 0 && adapters.secondary.length === 0 && adapters.tertiary.length === 0;
}

function resolveAdapters(languages: SearchLanguages): AdaptersResolved | undefined {
	const adaptersResolved: AdaptersResolved = { primary: [], secondary: [], tertiary: [] };

	const adapters = adaptersLocalised[languages.target];
	if (adapters === undefined) {
		return undefined;
	}

	if (isSearchMonolingual(languages.source, languages.target)) {
		if (adapters.primary.source !== undefined) {
			adaptersResolved.primary.push(...adapters.primary.source);
		}

		if (adapters.secondary?.source !== undefined) {
			adaptersResolved.secondary.push(...adapters.secondary.source);
		}

		if (adapters.tertiary?.source !== undefined) {
			adaptersResolved.tertiary.push(...adapters.tertiary.source);
		}
	} else {
		if (adapters.primary.targets !== undefined) {
			const targetAdapters = getTargetDictionaries(adapters.primary.targets, languages.target);
			if (targetAdapters !== undefined) {
				adaptersResolved.primary.push(...targetAdapters);
			}
		}

		if (adapters.secondary?.targets !== undefined) {
			const targetAdapters = getTargetDictionaries(adapters.secondary.targets, languages.target);
			if (targetAdapters !== undefined) {
				adaptersResolved.secondary.push(...targetAdapters);
			}
		}

		if (adapters.tertiary?.targets !== undefined) {
			const targetAdapters = getTargetDictionaries(adapters.tertiary.targets, languages.target);
			if (targetAdapters !== undefined) {
				adaptersResolved.tertiary.push(...targetAdapters);
			}
		}

		if (areAdaptersMissing(adaptersResolved)) {
			return resolveAdapters({ source: languages.source, target: languages.source });
		}
	}

	return adaptersResolved;
}

function getTargetDictionaries<
	SourceLanguage extends LocalisationLanguage,
	TargetLanguage extends Exclude<LearningLanguage, SourceLanguage>,
	Adapters extends TargetDictionaryAdapters<SourceLanguage>,
>(adapters: Adapters, targetLanguage: TargetLanguage): DictionaryAdapters | undefined {
	const targetAdapters = adapters[targetLanguage];
	if (targetAdapters !== undefined) {
		return targetAdapters;
	}

	const defaultAdapters = (adapters as Partial<Record<LearningLanguage, DictionaryAdapter[]>>)[
		defaults.LOCALISATION_LANGUAGE
	];
	if (defaultAdapters === undefined) {
		return undefined;
	}

	return defaultAdapters;
}

export { resolveAdapters, isSearchMonolingual, areAdaptersMissing };
