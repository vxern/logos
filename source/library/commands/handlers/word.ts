import type { DictionarySearchMode } from "logos:constants/dictionaries";
import { isLearningLanguage } from "logos:constants/languages/learning";
import type { PartOfSpeech } from "logos:constants/parts-of-speech";
import type { DictionaryEntry } from "logos/adapters/dictionaries/dictionary-entry";
import type { Client } from "logos/client";
import { WordInformationComponent } from "logos/commands/components/word-information";
import { handleAutocompleteLanguage } from "logos/commands/fragments/autocomplete/language";

async function handleFindWordAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { language: string | undefined }>,
): Promise<void> {
	await handleAutocompleteLanguage(
		client,
		interaction,
		{ type: "learning" },
		{ parameter: interaction.parameters.language },
	);
}

/** Allows the user to look up a word and get information about it. */
async function handleFindWord(
	client: Client,
	interaction: Logos.Interaction<any, { word: string; language: string | undefined; verbose: boolean | undefined }>,
	{ searchMode }: { searchMode?: DictionarySearchMode },
): Promise<void> {
	if (interaction.parameters.language !== undefined && !isLearningLanguage(interaction.parameters.language)) {
		const strings = constants.contexts.invalidLanguage({ localise: client.localise, locale: interaction.locale });
		client.error(interaction, { title: strings.title, description: strings.description }).ignore();

		return;
	}

	const learningLanguage = interaction.parameters.language ?? interaction.learningLanguage;
	searchMode = searchMode ?? constants.SEARCH_MODE;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guild = client.entities.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const dictionaries = client.adapters.dictionaries.getAdapters({ learningLanguage });
	if (dictionaries === undefined) {
		const strings = constants.contexts.noDictionaryAdapters({
			localise: client.localise,
			locale: interaction.locale,
		});
		client.unsupported(interaction, { title: strings.title, description: strings.description }).ignore();

		return;
	}

	await client.postponeReply(interaction, { visible: interaction.parameters.show });

	client.log.info(
		`Looking up the word '${interaction.parameters.word}' from ${
			dictionaries.length
		} dictionaries as requested by ${client.diagnostics.user(interaction.user)} on ${guild.name}...`,
	);

	const unclassifiedEntries: DictionaryEntry[] = [];
	const entriesByPartOfSpeech = new Map<PartOfSpeech, DictionaryEntry[]>();
	let searchesCompleted = 0;
	for (const dictionary of dictionaries) {
		if (dictionary.isFallback && searchesCompleted !== 0) {
			continue;
		}

		const entries = await dictionary.getEntries(interaction, interaction.parameters.word, learningLanguage, {
			searchMode,
		});
		if (entries === undefined) {
			continue;
		}

		const organised = new Map<PartOfSpeech, DictionaryEntry[]>();
		for (const entry of entries) {
			if (entry.partOfSpeech === undefined) {
				continue;
			}

			const partOfSpeech = entry.partOfSpeech.detected;

			if (partOfSpeech === "unknown") {
				unclassifiedEntries.push(entry);
				continue;
			}

			if (!organised.has(partOfSpeech)) {
				organised.set(partOfSpeech, [entry]);
				continue;
			}

			organised.get(partOfSpeech)?.push(entry);
		}

		for (const [partOfSpeech, entries] of organised.entries()) {
			if (!entriesByPartOfSpeech.has(partOfSpeech)) {
				entriesByPartOfSpeech.set(partOfSpeech, entries);
				continue;
			}

			const existingEntries = entriesByPartOfSpeech.get(partOfSpeech) ?? entries;

			for (const index of new Array(entries).keys()) {
				const existingEntry = existingEntries[index];
				const entry = entries[index];
				if (entry === undefined) {
					throw new Error(
						`Entry at index ${index} for part of speech ${partOfSpeech} unexpectedly undefined.`,
					);
				}

				if (existingEntry === undefined) {
					existingEntries[index] = entry;
					continue;
				}

				existingEntries[index] = {
					...existingEntry,
					...entry,
					sources: [...existingEntry.sources, ...entry.sources],
				};
			}
		}

		searchesCompleted += 1;
	}

	const entries = sanitiseEntries([...Array.from(entriesByPartOfSpeech.values()).flat(), ...unclassifiedEntries]);
	if (entries.length === 0) {
		const strings = constants.contexts.noInformation({
			localise: client.localise,
			locale: interaction.displayLocale,
		});
		client
			.warned(
				interaction,
				{
					title: strings.title,
					description: strings.description({ word: interaction.parameters.word }),
				},
				{ autoDelete: true },
			)
			.ignore();

		return;
	}

	const wordInformation = new WordInformationComponent(client, { interaction, entries, searchMode });

	await wordInformation.display();
}

function sanitiseEntries(entries: DictionaryEntry[]): DictionaryEntry[] {
	for (const entry of entries) {
		if (entry.etymology === undefined) {
			continue;
		}

		entry.etymology.value = entry.etymology.value?.replaceAll("*", "\\*");
	}
	return entries;
}

export { handleFindWord, handleFindWordAutocomplete };
