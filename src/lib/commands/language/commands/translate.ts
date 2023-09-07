import constants from "../../../../constants/constants";
import languages, {
	Languages,
	Locale,
	TranslationLanguage,
	getTranslationLanguage,
	isTranslationLanguage,
} from "../../../../constants/languages";
import localisations from "../../../../constants/localisations";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import { editReply, getShowButton, parseArguments, postponeReply, reply, respond } from "../../../interactions";
import { asStream } from "../../../utils";
import { CommandTemplate } from "../../command";
import { show } from "../../parameters";
import { Translation } from "../translators/adapter";
import { resolveAdapters } from "../translators/adapters";
import * as Discord from "@discordeno/bot";
import { detectLanguages } from "./detect";

const command: CommandTemplate = {
	name: "translate",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	isRateLimited: true,
	handle: handleTranslateText,
	handleAutocomplete: handleTranslateTextAutocomplete,
	options: [
		{
			name: "text",
			type: Discord.ApplicationCommandOptionTypes.String,
			required: true,
		},
		{
			name: "to",
			type: Discord.ApplicationCommandOptionTypes.String,
			autocomplete: true,
		},
		{
			name: "from",
			type: Discord.ApplicationCommandOptionTypes.String,
			autocomplete: true,
		},
		show,
	],
};

async function handleTranslateTextAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const [_, focused] = parseArguments(interaction.data?.options, { show: "boolean" });

	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	if (focused === undefined || focused.value === undefined) {
		return;
	}

	const inputLowercase = (focused.value as string).toLowerCase();

	const choices = languages.languages.translation
		.map((language) => {
			const languageStringKey = localisations.languages[language];

			if (languageStringKey === undefined) {
				return {
					name: language,
					value: language,
				};
			}

			const strings = {
				language: localise(client, languageStringKey, locale)(),
			};

			return {
				name: strings.language,
				value: language,
			};
		})
		.filter((choice) => choice.name?.toLowerCase().includes(inputLowercase))
		.slice(0, 25)
		.sort((previous, next) => previous.name.localeCompare(next.name));

	respond([client, bot], interaction, choices);
}

/** Allows the user to translate text from one language to another through the DeepL API. */
async function handleTranslateText(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const [{ from, to, text, show: showParameter }] = parseArguments(interaction.data?.options, { show: "boolean" });
	if (text === undefined) {
		return;
	}

	const show = interaction.show ?? showParameter ?? false;
	const language = show ? interaction.guildLanguage : interaction.language;
	const locale = show ? interaction.guildLocale : interaction.locale;

	const isTextEmpty = text.trim().length === 0;
	if (isTextEmpty) {
		const locale = interaction.locale;

		const strings = {
			title: localise(client, "translate.strings.textEmpty.title", locale)(),
			description: localise(client, "translate.strings.textEmpty.description", locale)(),
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				},
			],
		});

		return;
	}

	let sourceLanguage: TranslationLanguage;

	if (from !== undefined || to !== undefined) {
		const isSourceInvalid = from !== undefined && !isTranslationLanguage(from);
		const isTargetInvalid = to !== undefined && !isTranslationLanguage(to);

		const locale = interaction.locale;

		if (isSourceInvalid && isTargetInvalid) {
			const strings = {
				both: {
					title: localise(client, "translate.strings.invalid.both.title", locale)(),
					description: localise(client, "translate.strings.invalid.both.description", locale)(),
				},
			};

			reply([client, bot], interaction, {
				embeds: [
					{
						title: strings.both.title,
						description: strings.both.description,
						color: constants.colors.red,
					},
				],
			});

			return;
		} else if (isSourceInvalid) {
			const strings = {
				source: {
					title: localise(client, "translate.strings.invalid.source.title", locale)(),
					description: localise(client, "translate.strings.invalid.source.description", locale)(),
				},
			};

			reply([client, bot], interaction, {
				embeds: [
					{
						title: strings.source.title,
						description: strings.source.description,
						color: constants.colors.red,
					},
				],
			});

			return;
		} else if (isTargetInvalid) {
			const strings = {
				target: {
					title: localise(client, "translate.strings.invalid.target.title", locale)(),
					description: localise(client, "translate.strings.invalid.target.description", locale)(),
				},
			};

			reply([client, bot], interaction, {
				embeds: [
					{
						title: strings.target.title,
						description: strings.target.description,
						color: constants.colors.red,
					},
				],
			});

			return;
		}

		if (from !== undefined && to !== undefined) {
			if (from === to) {
				const locale = interaction.locale;

				const strings = {
					title: localise(client, "translate.strings.languagesNotDifferent.title", locale)(),
					description: localise(client, "translate.strings.languagesNotDifferent.description", locale)(),
				};

				reply([client, bot], interaction, {
					embeds: [
						{
							title: strings.title,
							description: strings.description,
							color: constants.colors.dullYellow,
						},
					],
				});
				return;
			}

			translateText([client, bot], interaction, text, { source: from, target: to }, { show }, { locale });
			return;
		} else {
			if (from === undefined) {
				const detectedLanguage = await detectLanguage([client, bot], interaction, text);
				if (detectedLanguage === undefined) {
					return;
				}

				sourceLanguage = detectedLanguage;
			} else {
				sourceLanguage = from;
			}
		}
	} else {
		const detectedLanguage = await detectLanguage([client, bot], interaction, text);
		if (detectedLanguage === undefined) {
			return;
		}

		sourceLanguage = detectedLanguage;
	}

	if (to !== undefined) {
		if (to !== sourceLanguage) {
			translateText([client, bot], interaction, text, { source: sourceLanguage, target: to }, { show }, { locale });
			return;
		}
	}

	const learningTranslationLanguage = getTranslationLanguage(interaction.learningLanguage);
	if (learningTranslationLanguage !== undefined) {
		if (learningTranslationLanguage !== sourceLanguage) {
			translateText(
				[client, bot],
				interaction,
				text,
				{ source: sourceLanguage, target: learningTranslationLanguage },
				{ show },
				{ locale },
			);
			return;
		}
	}

	const translationLanguage = getTranslationLanguage(language);
	if (translationLanguage === undefined) {
		const locale = interaction.locale;

		const strings = {
			title: localise(client, "translate.strings.cannotDetermine.target.title", locale)(),
			description: {
				cannotDetermine: localise(
					client,
					"translate.strings.cannotDetermine.target.description.cannotDetermine",
					locale,
				)(),
				tryAgain: localise(client, "translate.strings.cannotDetermine.target.description.tryAgain", locale)(),
			},
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: `${strings.description.cannotDetermine}\n\n${strings.description.tryAgain}`,
					color: constants.colors.peach,
				},
			],
		});

		return;
	}

	if (translationLanguage === sourceLanguage) {
		const locale = interaction.locale;

		const strings = {
			title: localise(client, "translate.strings.cannotDetermine.target.title", locale)(),
			description: {
				cannotDetermine: localise(
					client,
					"translate.strings.cannotDetermine.target.description.cannotDetermine",
					locale,
				)(),
				tryAgain: localise(client, "translate.strings.cannotDetermine.target.description.tryAgain", locale)(),
			},
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: `${strings.description.cannotDetermine}\n\n${strings.description.tryAgain}`,
					color: constants.colors.peach,
				},
			],
		});

		return;
	}

	translateText(
		[client, bot],
		interaction,
		text,
		{ source: sourceLanguage, target: translationLanguage },
		{ show },
		{ locale },
	);
}

async function detectLanguage(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	text: string,
): Promise<TranslationLanguage | undefined> {
	const detectionResult = (await detectLanguages(text)).likely.at(0);
	if (detectionResult === undefined) {
		const locale = interaction.locale;

		const strings = {
			title: localise(client, "translate.strings.cannotDetermine.source.title", locale)(),
			description: {
				cannotDetermine: localise(
					client,
					"translate.strings.cannotDetermine.source.description.cannotDetermine",
					locale,
				)(),
				tryAgain: localise(client, "translate.strings.cannotDetermine.source.description.tryAgain", locale)(),
			},
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: `${strings.description.cannotDetermine}\n\n${strings.description.tryAgain}`,
					color: constants.colors.peach,
				},
			],
		});

		return undefined;
	}

	const detectedLanguage = getTranslationLanguage(detectionResult);
	if (detectedLanguage === undefined) {
		const locale = interaction.locale;

		const strings = {
			title: localise(client, "translate.strings.languageNotSupported.title", locale)(),
			description: localise(client, "translate.strings.languageNotSupported.description", locale)(),
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				},
			],
		});

		return undefined;
	}

	return detectedLanguage;
}

async function translateText(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	text: string,
	languages: Languages<TranslationLanguage>,
	{ show }: { show: boolean },
	{ locale }: { locale: Locale },
): Promise<void> {
	const adapters = resolveAdapters(languages);
	if (adapters === undefined || adapters.length === 0) {
		const strings = {
			title: localise(client, "translate.strings.noTranslationAdapters.title", locale)(),
			description: localise(client, "translate.strings.noTranslationAdapters.description", locale)(),
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.yellow,
				},
			],
		});
		return;
	}

	await postponeReply([client, bot], interaction, { visible: show });

	let translation: Translation | undefined;
	for await (const element of asStream(adapters, (adapter) => adapter.translate(client, text, languages))) {
		if (element.result === undefined) {
			continue;
		}

		translation = element.result;

		break;
	}

	if (translation === undefined) {
		const strings = {
			title: localise(client, "translate.strings.failed.title", locale)(),
			description: localise(client, "translate.strings.failed.description", locale)(),
		};

		editReply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.red,
				},
			],
		});
		return;
	}

	// Ensures that an empty translation string does not result in embed failure.
	const translatedText = translation.text.trim().length !== 0 ? translation.text : constants.symbols.meta.whitespace;

	const strings = {
		languages: {
			source: localise(client, localisations.languages[languages.source], locale)(),
			target: localise(client, localisations.languages[languages.target], locale)(),
		},
		sourceText: localise(client, "translate.strings.sourceText", locale)(),
		translation: localise(client, "translate.strings.translation", locale)(),
	};

	const isLong = text.length > 896; // 7/8 of 1024. Leaves room for text overhead.

	let embeds: Discord.CamelizedDiscordEmbed[] = [];
	if (isLong) {
		embeds = [
			{
				color: constants.colors.blue,
				title: strings.sourceText,
				description: text,
			},
			{
				color: constants.colors.blue,
				title: strings.translation,
				description: translatedText,
				footer: {
					text: `${strings.languages.source} ${constants.symbols.indicators.arrowRight} ${strings.languages.target}`,
				},
			},
		];
	} else {
		embeds = [
			{
				color: constants.colors.blue,
				fields: [
					{
						name: strings.sourceText,
						value: text,
						inline: false,
					},
					{
						name: strings.translation,
						value: translatedText,
						inline: false,
					},
				],
				footer: {
					text: `${strings.languages.source} ${constants.symbols.indicators.arrowRight} ${strings.languages.target}`,
				},
			},
		];
	}

	const showButton = getShowButton(client, interaction, { locale });

	const components: Discord.ActionRow[] | undefined = show
		? undefined
		: [{ type: Discord.MessageComponentTypes.ActionRow, components: [showButton] }];

	editReply([client, bot], interaction, { embeds, components });
}

export default command;
