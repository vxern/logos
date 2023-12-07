import { Languages, LearningLanguage, LocalisationLanguage, getFeatureLanguage } from "../../../../constants/languages";
import defaults from "../../../../defaults";
import { DictionaryAdapter, DictionaryProvision } from "./adapter";
import dexonline from "./adapters/dexonline";
import dicolink from "./adapters/dicolink";
import pons from "./adapters/pons";
import wiktionary from "./adapters/wiktionary";
import wordnik from "./adapters/wordnik";
import wordsApi from "./adapters/words-api";
import { createProvisionSupply } from "./dictionary-provision";

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
	Danish: {
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
			targets: {
				"English/British": [wiktionary],
			},
		},
		secondary: {
			source: [wordnik, pons],
			targets: {
				"English/British": [wordnik, pons],
			},
		},
		tertiary: {
			source: [wordsApi],
			targets: {
				"English/British": [wordsApi],
			},
		},
	},
	"English/British": {
		primary: {
			source: [wiktionary],
			targets: {
				"English/American": [wiktionary],
			},
		},
		secondary: {
			source: [wordnik, pons],
			targets: {
				"English/American": [wordnik, pons],
			},
		},
		tertiary: {
			source: [wordsApi],
			targets: {
				"English/American": [wordsApi],
			},
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
		secondary: {
			targets: {
				"English/American": [pons],
				"English/British": [pons],
				German: [pons],
				// "Italian": [pons],
				Polish: [pons],
				// "Portuguese": [pons],
				// "Slovenian": [pons],
				// "Spanish": [pons],
				// "Chinese": [pons],
			},
		},
	},
	German: {
		primary: {
			source: [pons],
			targets: {
				"English/American": [pons],
				"English/British": [pons],
				Dutch: [pons],
				French: [pons],
				Finnish: [pons],
				Greek: [pons],
				Hungarian: [pons],
				"Norwegian/Bokmål": [pons],
				// "Italian": [pons],
				Polish: [pons],
				// "Portuguese": [pons],
				Romanian: [pons],
				Russian: [pons],
				// "Slovenian": [pons],
				// "Spanish": [pons],
				Swedish: [pons],
				Turkish: [pons],
				// "Chinese": [pons],
				// "Latin": [pons],
				// "Elvish": [pons],
				// "Arabic": [pons],
				// "Persian": [pons],
				// "Croatian": [pons],
				// "Japanese": [pons],
				// "Slovak": [pons],
				// "Bulgarian": [pons],
				// "Danish": [pons],
				// "Czech": [pons],
				// "Icelandic": [pons],
				// "Serbian": [pons],
			},
		},
		secondary: {
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
		secondary: {
			targets: {
				German: [pons],
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
		secondary: {
			targets: {
				German: [pons],
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
		secondary: {
			targets: {
				German: [pons],
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
		secondary: {
			targets: {
				"English/American": [pons],
				"English/British": [pons],
				French: [pons],
				// "Italian": [pons],
				German: [pons],
				Russian: [pons],
				// "Spanish": [pons],
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
		secondary: {
			targets: {
				German: [pons],
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
		secondary: {
			targets: {
				"English/American": [pons],
				"English/British": [pons],
				German: [pons],
				Polish: [pons],
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
	Spanish: {
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
		secondary: {
			targets: {
				German: [pons],
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
		secondary: {
			targets: {
				German: [pons],
			},
		},
	},
};

type AdaptersResolved = {
	primary: DictionaryAdapter[];
	secondary: DictionaryAdapter[];
	tertiary: DictionaryAdapter[];
};

function isSearchMonolingual<SourceLanguage extends LearningLanguage>(
	sourceLanguage: SourceLanguage,
	targetLanguage: LearningLanguage,
): targetLanguage is SourceLanguage {
	if (sourceLanguage === targetLanguage) {
		return true;
	}

	const sourceFeatureLanguage = getFeatureLanguage(sourceLanguage);
	const targetFeatureLanguage = getFeatureLanguage(targetLanguage);

	return sourceFeatureLanguage === targetFeatureLanguage;
}

function areAdaptersMissing(adapters: AdaptersResolved): boolean {
	return adapters.primary.length === 0 && adapters.secondary.length === 0 && adapters.tertiary.length === 0;
}

function resolveAdapters(languages: Languages<LearningLanguage>): AdaptersResolved | undefined {
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
			return resolveAdapters({ source: languages.target, target: languages.target });
		}
	}

	return adaptersResolved;
}

function getAdapterSelection(
	provisions: DictionaryProvision[],
	adapters: DictionaryAdapter[],
	count: number,
): DictionaryAdapter[] {
	const provisionSupply = createProvisionSupply();

	const adapterProvisionTuples = getAdaptersSortedByProvision(adapters, provisions);

	const adapterSelection: DictionaryAdapter[] = [];
	for (const [adapter, provides] of adapterProvisionTuples) {
		if (adapterSelection.length === count) {
			break;
		}

		const uniqueProvisions = provides.filter((provision) => provisionSupply[provision] === 0);
		if (uniqueProvisions.length < defaults.DICTIONARY_PROVISION_THRESHOLD) {
			continue;
		}

		for (const provision of provides) {
			provisionSupply[provision]++;
		}

		adapterSelection.push(adapter);
	}

	return adapterSelection;
}

function getAdaptersSortedByProvision(
	adapters: DictionaryAdapter[],
	missingProvisions: DictionaryProvision[],
): [DictionaryAdapter, DictionaryProvision[]][] {
	return adapters
		.map<[DictionaryAdapter, DictionaryProvision[]]>((adapter) => {
			const provides: DictionaryProvision[] = [];
			for (const provision of adapter.provides) {
				if (!missingProvisions.includes(provision)) {
					continue;
				}

				provides.push(provision);
			}

			return [adapter, provides];
		})
		.sort(([_, a], [__, b]) => b.length - a.length);
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

export { resolveAdapters, isSearchMonolingual, areAdaptersMissing, getAdapterSelection };
export type { AdaptersResolved };
