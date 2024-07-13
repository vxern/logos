import type { Locale } from "logos:constants/languages";
import { capitalise } from "logos:core/formatting";
import * as levenshtein from "fastest-levenshtein";
import type { Client } from "logos/client";
import { InteractionCollector } from "logos/collectors";
import { TatoebaSourceNotice } from "logos/commands/components/source-notices/tatoeba-source-notice.ts";
import { GuildStatistics } from "logos/models/guild-statistics";
import { User } from "logos/models/user";
import type { SentencePair } from "logos/stores/volatile";

function random(max: number): number {
	return Math.floor(Math.random() * max);
}

const wordSegmenter = new Intl.Segmenter(undefined, { granularity: "word" });

interface GameData {
	readonly guessButton: InteractionCollector<[index: string]>;
	readonly skipButton: InteractionCollector;
	sentenceSelection: SentenceSelection;
	embedColour: number;
	sessionScore: number;
}

/** Starts a simple game of 'choose the correct word to fit in the blank'. */
async function handleStartGame(client: Client, interaction: Logos.Interaction): Promise<void> {
	const sentencePairCount = await client.volatile?.getSentencePairCount({
		learningLocale: interaction.learningLocale,
	});
	if (sentencePairCount === undefined || sentencePairCount === 0) {
		const strings = constants.contexts.noSentencesAvailable({
			localise: client.localise,
			locale: interaction.locale,
		});
		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		setTimeout(
			() =>
				client.deleteReply(interaction).catch(() => {
					client.log.warn(`Failed to delete "no results for word" message.`);
				}),
			constants.defaults.WARN_MESSAGE_DELETE_TIMEOUT,
		);

		return;
	}

	const guildStatisticsDocument = await GuildStatistics.getOrCreate(client, {
		guildId: interaction.guildId.toString(),
	});
	const userDocument = await User.getOrCreate(client, { userId: interaction.user.id.toString() });

	await guildStatisticsDocument.update(client, () => {
		guildStatisticsDocument.registerSession({
			game: "pickMissingWord",
			learningLocale: interaction.learningLocale,
			isUnique:
				userDocument.getGameScores({ game: "pickMissingWord", learningLocale: interaction.learningLocale }) ===
				undefined,
		});
	});

	await userDocument.update(client, () => {
		userDocument.registerSession({ game: "pickMissingWord", learningLocale: interaction.learningLocale });
	});

	await client.postponeReply(interaction);

	const guessButton = new InteractionCollector<[index: string]>(client, {
		only: [interaction.user.id],
	});
	const skipButton = new InteractionCollector(client, { only: [interaction.user.id] });

	guessButton.onInteraction(async (buttonPress) => {
		await client.acknowledge(buttonPress);

		const pick = data.sentenceSelection.allPicks.find((pick) => pick[0].toString() === buttonPress.metadata[1]);
		const isCorrect = pick === data.sentenceSelection.correctPick;

		await guildStatisticsDocument.update(client, () => {
			guildStatisticsDocument.incrementScore({
				game: "pickMissingWord",
				learningLocale: interaction.learningLocale,
			});
		});

		await userDocument.update(client, () => {
			userDocument.incrementScore({ game: "pickMissingWord", learningLocale: interaction.learningLocale });
		});

		if (isCorrect) {
			data.sessionScore += 1;
			data.embedColour = constants.colours.lightGreen;
			data.sentenceSelection = await getSentenceSelection(client, { learningLocale: interaction.learningLocale });

			await client.editReply(interaction, await getGameView(client, interaction, data, userDocument, "hide"));
		} else {
			data.embedColour = constants.colours.red;

			await client.editReply(interaction, await getGameView(client, interaction, data, userDocument, "reveal"));
		}
	});

	skipButton.onInteraction(async (buttonPress) => {
		await client.acknowledge(buttonPress);

		data.embedColour = constants.colours.blue;
		data.sentenceSelection = await getSentenceSelection(client, { learningLocale: interaction.learningLocale });

		await client.editReply(interaction, await getGameView(client, interaction, data, userDocument, "hide"));
	});

	await client.registerInteractionCollector(guessButton);
	await client.registerInteractionCollector(skipButton);

	const data: GameData = {
		guessButton,
		skipButton,
		sentenceSelection: await getSentenceSelection(client, { learningLocale: interaction.learningLocale }),
		embedColour: constants.colours.blue,
		sessionScore: 0,
	};

	await client.editReply(interaction, await getGameView(client, interaction, data, userDocument, "hide"));
}

async function getGameView(
	client: Client,
	interaction: Logos.Interaction,
	data: GameData,
	userDocument: User,
	mode: "hide" | "reveal",
): Promise<Discord.InteractionCallbackData> {
	const totalScore =
		userDocument.getGameScores({ game: "pickMissingWord", learningLocale: interaction.learningLocale })
			?.totalScore ?? 0;

	const sourceNotice = new TatoebaSourceNotice(client, {
		interaction,
		sentenceId: data.sentenceSelection.sentencePair.sentenceId,
		translationId: data.sentenceSelection.sentencePair.translationId,
	});

	await sourceNotice.register();

	const wholeWordPattern = constants.patterns.wholeWord(data.sentenceSelection.correctPick[1]);
	const mask = constants.special.game.mask.repeat(data.sentenceSelection.correctPick[1].length);

	const strings = constants.contexts.game({ localise: client.localise, locale: interaction.locale });
	return {
		embeds: [
			{
				title:
					mode === "reveal"
						? data.sentenceSelection.sentencePair.sentence.replaceAll(
								wholeWordPattern,
								`__${data.sentenceSelection.correctPick[1]}__`,
							)
						: data.sentenceSelection.sentencePair.sentence.replaceAll(wholeWordPattern, mask),
				description: data.sentenceSelection.sentencePair.translation,
				color: data.embedColour,
				footer: {
					text: `${strings.correctGuesses({ number: data.sessionScore })} · ${strings.allTime({
						number: totalScore,
					})}`,
				},
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

					let customId: string;
					if (mode === "hide") {
						customId = data.guessButton.encodeId([pick[0].toString()]);
					} else {
						customId = InteractionCollector.encodeCustomId([
							InteractionCollector.noneId,
							pick[0].toString(),
						]);
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
					sourceNotice.button,
				] as [Discord.ButtonComponent, Discord.ButtonComponent],
			},
		],
	};
}

function getWords(...sentences: string[]): string[] {
	const wordsAll: string[] = [];

	for (const sentence of sentences) {
		const segmentsRaw = Array.from(wordSegmenter.segment(sentence));

		const segmentsProcessedSeparate: Intl.SegmentData[][] = [];
		let isCompound = false;

		for (const segment of segmentsRaw) {
			if (constants.patterns.wordSeparator.test(segment.segment)) {
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

		const segmentsProcessed = segmentsProcessedSeparate.map<{ segment: string; isWordLike: boolean }>(
			(segments) => {
				let isWordLike = false;
				const segmentStrings: string[] = [];
				for (const segment of segments) {
					isWordLike ||= segment.isWordLike ?? false;
					segmentStrings.push(segment.segment);
				}

				return { segment: segmentStrings.join(""), isWordLike };
			},
		);

		for (const segment of segmentsProcessed) {
			if (!segment.isWordLike) {
				continue;
			}

			if (constants.patterns.digit.test(segment.segment)) {
				continue;
			}

			wordsAll.push(segment.segment);
		}
	}

	return wordsAll;
}

// Mutates the original array.
function extractRandomWord(words: string[]): string {
	const word = words.splice(random(words.length), 1).at(0);
	if (word === undefined) {
		throw new Error("Failed to extract random word.");
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

type Selection = [id: number, word: string];
interface SentenceSelection {
	correctPick: Selection;
	allPicks: Selection[];
	sentencePair: SentencePair;
}

async function getSentenceSelection(
	client: Client,
	{ learningLocale }: { learningLocale: Locale },
): Promise<SentenceSelection> {
	const sentencePairs = await client.volatile!.getRandomSentencePairs({
		learningLocale,
		count: constants.PICK_MISSING_WORD_CHOICES,
	});

	const mainSentencePair = sentencePairs.splice(random(sentencePairs.length), 1).at(0);
	if (mainSentencePair === undefined) {
		throw new Error("Failed to select main sentence pair.");
	}

	const mainSentenceWords = Array.from(new Set(getWords(mainSentencePair.sentence)));
	const mainWord = extractRandomWord(mainSentenceWords);

	const mainWordLowercase = mainWord.toLowerCase();
	const wordsUnordered = Array.from(new Set(getWords(...sentencePairs.map((pair) => pair.sentence))))
		.filter((word) => word.toLowerCase() !== mainWordLowercase)
		.map((word) => ({ word, sort: Math.random() }))
		.sort((a, b) => a.sort - b.sort)
		.map(({ word }) => word);
	if (wordsUnordered.length < constants.PICK_MISSING_WORD_CHOICES - 1) {
		for (const _ of new Array(constants.PICK_MISSING_WORD_CHOICES - 1 - wordsUnordered.length).keys()) {
			wordsUnordered.push(constants.special.missingString);
		}
	}

	const words = Array.from(wordsUnordered)
		.map((word) => ({ word, sort: levenshtein.distance(mainWord, word) }))
		.sort((a, b) => b.sort - a.sort)
		.map(({ word }) => word);

	const decoysExposed: string[] = [];
	while (decoysExposed.length < constants.PICK_MISSING_WORD_CHOICES - 1) {
		const word = words.pop();
		if (word === undefined) {
			continue;
		}

		decoysExposed.push(word);
	}

	const decoys = camouflageDecoys(mainWord, decoysExposed);

	const correctPick: Selection = [mainSentencePair.sentenceId, mainWord];
	const allPicksRaw: Selection[] = [correctPick];
	for (const index of new Array(sentencePairs.length).keys()) {
		const [sentencePair, word] = [sentencePairs[index], decoys[index]];
		if (sentencePair === undefined || word === undefined) {
			throw new Error("Failed to create pick.");
		}

		allPicksRaw.push([sentencePair.sentenceId, word]);
	}
	const allPicks = allPicksRaw
		.map((pick) => ({ pick, sort: Math.random() }))
		.sort((a, b) => a.sort - b.sort)
		.map(({ pick }) => pick);

	return { correctPick, allPicks, sentencePair: mainSentencePair };
}

export { handleStartGame };
