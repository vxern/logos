import { capitalise } from "logos:constants/formatting";
import type { LearningLocale } from "logos:constants/languages/learning";
import * as levenshtein from "fastest-levenshtein";
import type { Client } from "logos/client";
import { InteractionCollector } from "logos/collectors";
import { TatoebaSourceNotice } from "logos/commands/components/source-notices/tatoeba-source-notice";
import { GuildStatistics } from "logos/models/guild-statistics";
import { User } from "logos/models/user";
import type { SentencePair } from "logos/stores/volatile";

type Selection = [id: number, word: string];
interface SentenceSelection {
	correctPick: Selection;
	allPicks: Selection[];
	sentencePair: SentencePair;
}

class GameViewComponent {
	static readonly #wordSegmenter = new Intl.Segmenter(undefined, { granularity: "word" });

	readonly #client: Client;
	readonly #interaction: Logos.Interaction;
	readonly #guesses: InteractionCollector<[index: string]>;
	readonly #skips: InteractionCollector;
	sentenceSelection!: SentenceSelection;
	guildStatisticsDocument!: GuildStatistics;
	userDocument!: User;
	embedColour: number;
	sessionScore: number;

	constructor(client: Client, { interaction }: { interaction: Logos.Interaction }) {
		this.#client = client;
		this.#interaction = interaction;
		this.#guesses = new InteractionCollector<[index: string]>(this.#client, {
			only: [this.#interaction.user.id],
		});
		this.#skips = new InteractionCollector(this.#client, { only: [this.#interaction.user.id] });
		this.embedColour = constants.colours.blue;
		this.sessionScore = 0;
	}

	async #setup(): Promise<void> {
		this.sentenceSelection = await this.getSentenceSelection({ learningLocale: this.#interaction.learningLocale });
		[this.guildStatisticsDocument, this.userDocument] = await Promise.all([
			GuildStatistics.getOrCreate(this.#client, {
				guildId: this.#interaction.guildId.toString(),
			}),
			User.getOrCreate(this.#client, { userId: this.#interaction.user.id.toString() }),
		]);

		await this.guildStatisticsDocument.update(this.#client, () => {
			this.guildStatisticsDocument.registerSession({
				game: "pickMissingWord",
				learningLocale: this.#interaction.learningLocale,
				isUnique:
					this.userDocument.getGameScores({
						game: "pickMissingWord",
						learningLocale: this.#interaction.learningLocale,
					}) === undefined,
			});
		});

		await this.userDocument.update(this.#client, () => {
			this.userDocument.registerSession({
				game: "pickMissingWord",
				learningLocale: this.#interaction.learningLocale,
			});
		});
	}

	async display(): Promise<void> {
		await this.#client.postponeReply(this.#interaction);

		await this.#setup();

		this.#guesses.onInteraction(this.#handleGuess.bind(this));
		this.#skips.onInteraction(this.#handleSkip.bind(this));

		await this.#client.registerInteractionCollector(this.#guesses);
		await this.#client.registerInteractionCollector(this.#skips);

		this.#client.editReply(this.#interaction, await this.getGameView("hide")).ignore();
	}

	async getGameView(mode: "hide" | "reveal"): Promise<Discord.InteractionCallbackData> {
		const totalScore =
			this.userDocument.getGameScores({
				game: "pickMissingWord",
				learningLocale: this.#interaction.learningLocale,
			})?.totalScore ?? 0;

		const sourceNotice = new TatoebaSourceNotice(this.#client, {
			interaction: this.#interaction,
			sentenceId: this.sentenceSelection.sentencePair.sentenceId,
			translationId: this.sentenceSelection.sentencePair.translationId,
		});

		await sourceNotice.register();

		const wholeWordPattern = constants.patterns.wholeWord(this.sentenceSelection.correctPick[1], {
			caseSensitive: false,
		});
		const mask = constants.special.game.mask.repeat(this.sentenceSelection.correctPick[1].length);

		const strings = constants.contexts.game({ localise: this.#client.localise, locale: this.#interaction.locale });
		return {
			embeds: [
				{
					title:
						mode === "reveal"
							? this.sentenceSelection.sentencePair.sentence.replaceAll(
									wholeWordPattern,
									`__${this.sentenceSelection.correctPick[1]}__`,
								)
							: this.sentenceSelection.sentencePair.sentence.replaceAll(wholeWordPattern, mask),
					description: this.sentenceSelection.sentencePair.translation,
					color: this.embedColour,
					footer: {
						text: `${strings.correctGuesses({ number: this.sessionScore })} · ${strings.allTime({
							number: totalScore,
						})}`,
					},
				},
			],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: this.sentenceSelection.allPicks.map((pick) => {
						let style: Discord.ButtonStyles;
						if (mode === "hide") {
							style = Discord.ButtonStyles.Primary;
						} else {
							const isCorrect = pick[0] === this.sentenceSelection.correctPick[0];
							if (isCorrect) {
								style = Discord.ButtonStyles.Success;
							} else {
								style = Discord.ButtonStyles.Danger;
							}
						}

						let customId: string;
						if (mode === "hide") {
							customId = this.#guesses.encodeId([pick[0].toString()]);
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
									customId: this.#skips.encodeId([]),
								}
							: {
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Secondary,
									label: `${constants.emojis.interactions.menu.controls.forward} ${strings.skip}`,
									customId: this.#skips.encodeId([]),
								},
						sourceNotice.button,
					] as [Discord.ButtonComponent, Discord.ButtonComponent],
				},
			],
		};
	}

	async #handleGuess(buttonPress: Logos.Interaction): Promise<void> {
		this.#client.acknowledge(buttonPress).ignore();

		const pick = this.sentenceSelection.allPicks.find((pick) => pick[0].toString() === buttonPress.metadata[1]);
		const isCorrect = pick === this.sentenceSelection.correctPick;

		await this.guildStatisticsDocument.update(this.#client, () => {
			this.guildStatisticsDocument.incrementScore({
				game: "pickMissingWord",
				learningLocale: this.#interaction.learningLocale,
			});
		});

		await this.userDocument.update(this.#client, () => {
			this.userDocument.incrementScore({
				game: "pickMissingWord",
				learningLocale: this.#interaction.learningLocale,
			});
		});

		if (isCorrect) {
			this.sentenceSelection = await this.getSentenceSelection({
				learningLocale: this.#interaction.learningLocale,
			});
			this.sessionScore += 1;
			this.embedColour = constants.colours.lightGreen;

			this.#client.editReply(this.#interaction, await this.getGameView("hide")).ignore();
		} else {
			this.embedColour = constants.colours.red;

			this.#client.editReply(this.#interaction, await this.getGameView("reveal")).ignore();
		}
	}

	async #handleSkip(buttonPress: Logos.Interaction): Promise<void> {
		this.#client.acknowledge(buttonPress).ignore();

		this.sentenceSelection = await this.getSentenceSelection({
			learningLocale: this.#interaction.learningLocale,
		});
		this.embedColour = constants.colours.blue;

		this.#client.editReply(this.#interaction, await this.getGameView("hide")).ignore();
	}

	getWords(...sentences: string[]): string[] {
		const wordsAll: string[] = [];

		for (const sentence of sentences) {
			const segmentsRaw = Array.from(GameViewComponent.#wordSegmenter.segment(sentence));

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
	extractRandomWord(words: string[]): string {
		const word = words.splice(random(words.length), 1).at(0);
		if (word === undefined) {
			throw new Error("Failed to extract random word.");
		}

		return word;
	}

	camouflageDecoys(likeness: string, decoys: string[]): string[] {
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

	async getSentenceSelection({ learningLocale }: { learningLocale: LearningLocale }): Promise<SentenceSelection> {
		const sentencePairs = await this.#client.volatile!.getRandomSentencePairs({
			learningLocale,
			count: constants.PICK_MISSING_WORD_CHOICES,
		});

		const mainSentencePair = sentencePairs.splice(random(sentencePairs.length), 1).at(0);
		if (mainSentencePair === undefined) {
			throw new Error("Failed to select main sentence pair.");
		}

		const mainSentenceWords = Array.from(new Set(this.getWords(mainSentencePair.sentence)));
		const mainWord = this.extractRandomWord(mainSentenceWords);

		const mainWordLowercase = mainWord.toLowerCase();
		const wordsUnordered = Array.from(new Set(this.getWords(...sentencePairs.map((pair) => pair.sentence))))
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

		const decoys = this.camouflageDecoys(mainWord, decoysExposed);

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
}

function random(max: number): number {
	return Math.floor(Math.random() * max);
}

export { GameViewComponent };
