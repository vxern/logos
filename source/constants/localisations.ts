import type { LocalisationLanguage } from "rost:constants/languages/localisation";
import pluralisers from "rost:constants/transformers/pluralisers";

type TransformerType = "pluralise";
type Transformer = (matchTerm: string, matches: Record<string, string>) => string | undefined;

const localisations = Object.freeze({
	transformers: {
		"Armenian/Western": { pluralise: pluralisers.invariant },
		"Armenian/Eastern": { pluralise: pluralisers.invariant },
		Danish: { pluralise: pluralisers.commonEuropean },
		Dutch: { pluralise: pluralisers.commonEuropean },
		"English/American": { pluralise: pluralisers.commonEuropean },
		"English/British": { pluralise: pluralisers.commonEuropean },
		Finnish: { pluralise: pluralisers.commonEuropean },
		French: { pluralise: pluralisers.commonEuropean },
		German: { pluralise: pluralisers.commonEuropean },
		Greek: { pluralise: pluralisers.commonEuropean },
		Hungarian: { pluralise: pluralisers.invariant },
		"Norwegian/Bokmal": { pluralise: pluralisers.commonEuropean },
		Polish: { pluralise: pluralisers.commonSlavic },
		Romanian: { pluralise: pluralisers.romanian },
		Russian: { pluralise: pluralisers.commonSlavic },
		Silesian: { pluralise: pluralisers.commonSlavic },
		Spanish: { pluralise: pluralisers.commonEuropean },
		Swedish: { pluralise: pluralisers.commonEuropean },
		Turkish: { pluralise: pluralisers.invariant },
	} satisfies Record<LocalisationLanguage, Record<TransformerType, Transformer>>,
} as const);

export default localisations;
export type { Transformer, TransformerType };
