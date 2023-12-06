import { Languages, LearningLanguage, Locale } from "../../../../constants/languages";
import { Client } from "../../../client";
import { DictionaryEntry, RequiredDictionaryEntryFields } from "./dictionary-entry";
import { DictionaryProvision } from "./dictionary-provision";

interface DictionaryProvisionToFieldName extends Record<DictionaryProvision, keyof DictionaryEntry> {
	"part-of-speech": "partOfSpeech";
	definitions: "definitions";
	translations: "translations";
	relations: "relations";
	syllables: "syllables";
	pronunciation: "pronunciation";
	rhymes: "rhymes";
	audio: "audio";
	expressions: "expressions";
	examples: "examples";
	frequency: "frequency";
	inflection: "inflection";
	etymology: "etymology";
	notes: "notes";
}

type DictionaryAdapterPriority = "primary" | "secondary" | "tertiary";

abstract class DictionaryAdapter<
	WordData = unknown,
	Provision extends DictionaryProvision = DictionaryProvision,
	Entry = Pick<DictionaryEntry, RequiredDictionaryEntryFields> &
		Partial<Pick<DictionaryEntry, DictionaryProvisionToFieldName[Provision]>>,
> {
	readonly identifier: string;
	readonly provides: Set<Provision>;

	constructor({ identifier, provides }: { identifier: string; provides: Set<Provision> }) {
		this.identifier = identifier;
		this.provides = provides;
	}

	/**
	 * Fetches data about {@link lemma}.
	 *
	 * @param client - Client instance to use.
	 * @param lemma - Lemma to fetch data about.
	 * @param languages - Languages to use for the request.
	 */
	abstract fetch(client: Client, lemma: string, languages: Languages<LearningLanguage>): Promise<WordData | undefined>;

	/**
	 * Taking {@link data}, converts it to {@link DictionaryEntry | dictionary entries}.
	 *
	 * @param client - Client instance to use for localising.
	 * @param lemma - Lemma the data pertains to.
	 * @param languages - Languages used to obtain the data.
	 * @param data - Data to parse.
	 * @param locale - Locale to present the dictionary entries in.
	 */
	abstract parse(
		client: Client,
		lemma: string,
		languages: Languages<LearningLanguage>,
		data: WordData,
		{ locale }: { locale: Locale },
	): Entry[] | undefined;

	/**
	 * Gets dictionary entries for {@link lemma} using {@link languages}, presenting the information in
	 * the given {@link locale}.
	 *
	 * @param client - Client instance to use.
	 * @param lemma - Lemma to search for entries about.
	 * @param languages - Languages to use for the request.
	 * @param locale - Locale to present the dictionary entries in.
	 */
	async tryGetInformation(
		client: Client,
		lemma: string,
		languages: Languages<LearningLanguage>,
		{ locale }: { locale: Locale },
	): Promise<Entry[] | undefined> {
		const data = await this.fetch(client, lemma, languages).catch((reason) => {
			client.log.error(
				`Failed to fetch word data for lemma "${lemma}" using languages source ${languages.source}, target ${languages.target} and locale ${locale}:`,
				reason,
			);
			return undefined;
		});
		if (data === undefined) {
			return undefined;
		}

		let entries: Entry[] | undefined;
		try {
			entries = this.parse(client, lemma, languages, data, { locale });
		} catch (exception) {
			client.log.error(
				`Failed to parse word data for lemma "${lemma}" using languages source ${languages.source}, target ${languages.target} and locale ${locale}:`,
				exception,
			);
			return undefined;
		}

		return entries;
	}
}

export { DictionaryAdapter };
export type { DictionaryProvision, DictionaryAdapterPriority };
