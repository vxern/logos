import * as levenshtein from "fastest-levenshtein";
import { Locale, getLocaleByLearningLanguage } from "../../../../constants/languages";
import licences from "../../../../constants/licences";
import { capitalise } from "../../../../formatting";
import { Client, InteractionCollector } from "../../../client";
import { GuildStats } from "../../../database/guild-stats";
import { User } from "../../../database/user";
import { CommandTemplate } from "../../command";

const command: CommandTemplate = {
	id: "game",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	handle: handleStartGame,
};

function random(max: number): number {
	return Math.floor(Math.random() * max);
}

const wordSegmenter = new Intl.Segmenter(undefined, { granularity: "word" });

interface GameData {
	sentenceSelection: SentenceSelection;
	embedColour: number;
	guessButton: InteractionCollector<[index: string]>;
	skipButton: InteractionCollector;
	sessionScore: number;
}

/** Starts a simple game of 'choose the correct word to fit in the blank'. */
async function handleStartGame(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;
	const learningLocale = getLocaleByLearningLanguage(interaction.learningLanguage);

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const sentencePairCount = await client.cache.database.scard(`${learningLocale}:index`);
	if (sentencePairCount === 0) {
		const strings = {
			title: client.localise("game.strings.noSentencesAvailable.title", locale)(),
			description: client.localise("game.strings.noSentencesAvailable.description", locale)(),
		};

		await client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				},
			],
		});

		setTimeout(
			() =>
				client.deleteReply(interaction).catch(() => {
					client.log.warn(`Failed to delete "no results for word" message.`);
				}),
			defaults.WARN_MESSAGE_DELETE_TIMEOUT,
		);

		return;
	}

	const guildStatsDocument = await GuildStats.getOrCreate(client, { guildId: guildId.toString() });
	const userDocument = await User.getOrCreate(client, { userId: interaction.user.id.toString() });

	await guildStatsDocument.update(client, () => {
		guildStatsDocument.registerSession({
			game: "pickMissingWord",
			learningLocale,
			isUnique: userDocument.getGameScores({ game: "pickMissingWord", learningLocale }) === undefined,
		});
	});

	await userDocument.update(client, () => {
		userDocument.registerSession({ game: "pickMissingWord", learningLocale });
	});

	await client.postponeReply(interaction);

	const guessButton = new InteractionCollector<[index: string]>(client, {
		only: [interaction.user.id],
		isSingle: true,
	});
	const skipButton = new InteractionCollector(client, { only: [interaction.user.id], isSingle: true });

	guessButton.onCollect(async (buttonPress) => {
		client.acknowledge(buttonPress);

		const pick = data.sentenceSelection.allPicks.find((pick) => pick[0] === buttonPress.metadata[1]);
		const isCorrect = pick === data.sentenceSelection.correctPick;

		await guildStatsDocument.update(client, () => {
			guildStatsDocument.incrementScore({ game: "pickMissingWord", learningLocale });
		});

		await userDocument.update(client, () => {
			userDocument.incrementScore({ game: "pickMissingWord", learningLocale });
		});

		if (isCorrect) {
			data.sessionScore++;
			data.embedColour = constants.colors.lightGreen;
			data.sentenceSelection = await getSentenceSelection(client, learningLocale);

			client.editReply(interaction, await getGameView(client, data, userDocument, "hide", { locale, learningLocale }));
		} else {
			data.embedColour = constants.colors.red;

			client.editReply(
				interaction,
				await getGameView(client, data, userDocument, "reveal", { locale, learningLocale }),
			);
		}
	});

	skipButton.onCollect(async (buttonPress) => {
		client.acknowledge(buttonPress);

		data.embedColour = constants.colors.blue;
		data.sentenceSelection = await getSentenceSelection(client, learningLocale);

		client.editReply(interaction, await getGameView(client, data, userDocument, "hide", { locale, learningLocale }));
	});

	client.registerInteractionCollector(guessButton);
	client.registerInteractionCollector(skipButton);

	const data: GameData = {
		sentenceSelection: await getSentenceSelection(client, learningLocale),
		embedColour: constants.colors.blue,
		guessButton: guessButton,
		skipButton: skipButton,
		sessionScore: 0,
	};

	client.editReply(interaction, await getGameView(client, data, userDocument, "hide", { locale, learningLocale }));
}

async function getGameView(
	client: Client,
	data: GameData,
	userDocument: User,
	mode: "hide" | "reveal",
	{ locale, learningLocale }: { locale: Locale; learningLocale: Locale },
): Promise<Discord.InteractionCallbackData> {
	const totalScore = userDocument.getGameScores({ game: "pickMissingWord", learningLocale })?.totalScore ?? 0;

	const strings = {
		sentence: client.localise("game.strings.sentence", locale)(),
		translation: client.localise("game.strings.translation", locale)(),
		skip: client.localise("game.strings.skip", locale)(),
		sourcedFrom: client.localise("game.strings.sourcedFrom", locale)({ source: licences.dictionaries.tatoeba.name }),
		correctGuesses: client.localise("game.strings.correctGuesses", locale)({ number: data.sessionScore }),
		allTime: client.localise("game.strings.allTime", locale)({ number: totalScore }),
		next: client.localise("game.strings.next", locale)(),
	};

	const sentenceSource = constants.links.tatoebaSentence(data.sentenceSelection.sentencePair.sentenceId.toString());
	const translationSource = constants.links.tatoebaSentence(
		data.sentenceSelection.sentencePair.translationId.toString(),
	);

	const wholeWordPattern = constants.patterns.wholeWord(data.sentenceSelection.correctPick[1]);
	const mask = constants.special.game.mask.repeat(data.sentenceSelection.correctPick[1].length);

	return {
		embeds: [
			{
				description: `${constants.emojis.link} [${strings.sentence}](${sentenceSource}) · [${strings.translation}](${translationSource})`,
				color: constants.colors.peach,
				footer: { text: strings.sourcedFrom },
			},
			{
				title:
					mode === "reveal"
						? data.sentenceSelection.sentencePair.sentence.replaceAll(
								wholeWordPattern,
								`__${data.sentenceSelection.correctPick[1]}__`,
						  )
						: data.sentenceSelection.sentencePair.sentence.replaceAll(wholeWordPattern, mask),
				description: data.sentenceSelection.sentencePair.translation,
				footer: { text: `${strings.correctGuesses} · ${strings.allTime}` },
				color: data.embedColour,
			},
		],
		components: [
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: data.sentenceSelection.allPicks.map((pick) => {
					let style: Discord.ButtonStyles;
					if (mode === "hide") {
						style = Discord.ButtonStyles.Primary;
					} else {
						const isCorrect = pick[0] === data.sentenceSelection.correctPick[0];
						if (isCorrect) {
							style = Discord.ButtonStyles.Success;
						} else {
							style = Discord.ButtonStyles.Danger;
						}
					}

					// TODO(vxern): Possibly insecure? The user could tell the right answer from the button IDs.
					let customId: string;
					if (mode === "hide") {
						customId = data.guessButton.encodeId([pick[0]]);
					} else {
						customId = InteractionCollector.noneId;
					}

					return {
						type: Discord.MessageComponentTypes.Button,
						style,
						disabled: mode === "reveal",
						label: pick[1],
						customId,
					};
				}) as [Discord.ButtonComponent],
			},
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					mode === "reveal"
						? {
								type: Discord.MessageComponentTypes.Button,
								style: Discord.ButtonStyles.Primary,
								label: `${constants.emojis.interactions.menu.controls.forward} ${strings.next}`,
								customId: data.skipButton.encodeId([]),
						  }
						: {
								type: Discord.MessageComponentTypes.Button,
								style: Discord.ButtonStyles.Secondary,
								label: `${constants.emojis.interactions.menu.controls.forward} ${strings.skip}`,
								customId: data.skipButton.encodeId([]),
						  },
				] as [Discord.ButtonComponent],
			},
		],
	};
}

async function getRandomIds(client: Client, locale: Locale): Promise<string[]> {
	const pipeline = client.cache.database.pipeline();
	for (const _ of Array(defaults.GAME_WORD_SELECTION).keys()) {
		pipeline.srandmember(`${locale}:index`);
	}

	const results = (await pipeline.exec()) ?? undefined;
	if (results === undefined) {
		throw "StateError: Failed to get random indexes for sentence pairs.";
	}

	const indexes = results.map((result) => {
		const [error, index] = result as [Error | null, string | null];
		if ((error ?? undefined) !== undefined || (index ?? undefined) === undefined) {
			throw `StateError: Failed to get random index for sentence pair: ${index}`;
		}

		return index as string;
	});

	return indexes;
}

/** Represents a pair of a sentence and its translation. */
interface SentencePair {
	sentenceId: number;

	/** The source sentence. */
	sentence: string;

	translationId: number;

	/** The translation of the sentence. */
	translation: string;
}

async function getSentencePairById(client: Client, locale: Locale, id: string): Promise<SentencePair> {
	const pairRaw = await client.cache.database.get(`${locale}:${id}`).then((sentencePair) => sentencePair ?? undefined);
	if (pairRaw === undefined) {
		throw `StateError: Failed to get sentence pair for locale ${locale} and index ${id}.`;
	}

	const [sentenceId, sentence, translationId, translation] = JSON.parse(pairRaw) as [number, string, number, string];
	return { sentenceId, sentence, translationId, translation };
}

async function getSentencePairsByIds(client: Client, locale: Locale, ids: string[]): Promise<SentencePair[]> {
	const promises: Promise<SentencePair>[] = [];
	for (const id of ids) {
		promises.push(getSentencePairById(client, locale, id));
	}

	const sentencePairs = await Promise.all(promises);
	return sentencePairs;
}

function getWords(...sentences: string[]): string[] {
	const wordsAll: string[] = [];

	for (const sentence of sentences) {
		const segmentsRaw = Array.from(wordSegmenter.segment(sentence));

		const segmentsProcessedSeparate: Intl.SegmentData[][] = [];
		let isCompound = false;

		for (const segment of segmentsRaw) {
			if (/[’'-]/.test(segment.segment)) {
				isCompound = true;
				segmentsProcessedSeparate.at(-1)?.push(segment);
				continue;
			}

			if (isCompound) {
				isCompound = false;
				segmentsProcessedSeparate.at(-1)?.push(segment);
				continue;
			}

			segmentsProcessedSeparate.push([segment]);
		}

		const segmentsProcessed = segmentsProcessedSeparate.map<{ segment: string; isWordLike: boolean }>((segments) => {
			let isWordLike = false;
			const segmentStrings: string[] = [];
			for (const segment of segments) {
				isWordLike ||= segment.isWordLike ?? false;
				segmentStrings.push(segment.segment);
			}

			return { segment: segmentStrings.join(""), isWordLike };
		});

		for (const segment of segmentsProcessed) {
			if (!segment.isWordLike) {
				continue;
			}

			if (/[0-9]/.test(segment.segment)) {
				continue;
			}

			wordsAll.push(segment.segment);
		}
	}

	return wordsAll;
}

// ! Mutates the original array.
function extractRandomWord(words: string[]): string {
	const word = words.splice(random(words.length), 1).at(0);
	if (word === undefined) {
		throw "StateError: Failed to extract random word.";
	}

	return word;
}

function camouflageDecoys(likeness: string, decoys: string[]): string[] {
	let results = [...decoys];

	const isUppercase = likeness.length > 1 && likeness.toUpperCase() === likeness;
	if (isUppercase) {
		results = results.map((result) => result.toUpperCase());
	}

	const isLowercase = likeness.toLowerCase() === likeness;
	if (isLowercase) {
		results = results.map((result) => result.toLowerCase());
	}

	const isFirstCapitalised = capitalise(likeness) === likeness;
	if (isFirstCapitalised) {
		results = results.map((result) => capitalise(result));
	}

	return results;
}

type Selection = [id: string, word: string];
interface SentenceSelection {
	correctPick: Selection;
	allPicks: Selection[];
	sentencePair: SentencePair;
}

async function getSentenceSelection(client: Client, locale: Locale): Promise<SentenceSelection> {
	// Pick random IDs of sentences to take words from.
	const ids = await getRandomIds(client, locale);
	const sentencePairs = await getSentencePairsByIds(client, locale, ids);

	const mainSentencePair = sentencePairs.splice(random(sentencePairs.length), 1).at(0);
	if (mainSentencePair === undefined) {
		throw "StateError: Failed to select main sentence pair.";
	}
	const mainId = ids
		.splice(
			ids.findIndex((id) => parseInt(id) === mainSentencePair.sentenceId),
			1,
		)
		.at(0);
	if (mainId === undefined) {
		throw "StateError: Failed to select main sentence pair ID.";
	}

	const mainSentenceWords = Array.from(new Set(getWords(mainSentencePair.sentence)));
	const mainWord = extractRandomWord(mainSentenceWords);

	const mainWordLowercase = mainWord.toLowerCase();
	const wordsUnordered = Array.from(new Set(getWords(...sentencePairs.map((pair) => pair.sentence))))
		.filter((word) => word.toLowerCase() !== mainWordLowercase)
		.map((word) => ({ word, sort: Math.random() }))
		.sort((a, b) => a.sort - b.sort)
		.map(({ word }) => word);
	if (wordsUnordered.length < defaults.GAME_WORD_SELECTION - 1) {
		for (const _ of Array(defaults.GAME_WORD_SELECTION - 1 - wordsUnordered.length).keys()) {
			wordsUnordered.push("?");
		}
	}

	const words = Array.from(wordsUnordered)
		.map((word) => ({ word, sort: levenshtein.distance(mainWord, word) }))
		.sort((a, b) => b.sort - a.sort)
		.map(({ word }) => word);

	const decoysExposed: string[] = [];
	while (decoysExposed.length < defaults.GAME_WORD_SELECTION - 1) {
		const word = words.pop();
		if (word === undefined) {
			continue;
		}

		decoysExposed.push(word);
	}

	const decoys = camouflageDecoys(mainWord, decoysExposed);

	const correctPick: Selection = [mainId, mainWord];
	const allPicksRaw: Selection[] = [correctPick];
	for (const index of Array(ids.length).keys()) {
		const [id, word] = [ids[index], decoys[index]];
		if (id === undefined || word === undefined) {
			throw "StateError: Failed to create pick.";
		}

		allPicksRaw.push([id, word]);
	}
	const allPicks = allPicksRaw
		.map((pick) => ({ pick, sort: Math.random() }))
		.sort((a, b) => a.sort - b.sort)
		.map(({ pick }) => pick);

	return { correctPick, allPicks, sentencePair: mainSentencePair };
}

export default command;
