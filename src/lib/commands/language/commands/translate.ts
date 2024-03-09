import languages, {
	Languages,
	Locale,
	TranslationLanguage,
	getTranslationLanguage,
	isTranslationLanguage,
} from "../../../../constants/languages";
import localisations from "../../../../constants/localisations";
import { trim } from "../../../../formatting";
import { asStream } from "../../../../utils";
import { Client } from "../../../client";
import { CommandTemplate } from "../../command";
import { show } from "../../parameters";
import { Translation } from "../translators/adapter";
import { resolveAdapters } from "../translators/adapters";
import { detectLanguages } from "./recognise";

const commands = {
	chatInput: {
		id: "translate",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleTranslateChatInput,
		handleAutocomplete: handleTranslateChatInputAutocomplete,
		options: [
			{
				id: "text",
				type: Discord.ApplicationCommandOptionTypes.String,
				required: true,
			},
			{
				id: "to",
				type: Discord.ApplicationCommandOptionTypes.String,
				autocomplete: true,
			},
			{
				id: "from",
				type: Discord.ApplicationCommandOptionTypes.String,
				autocomplete: true,
			},
			show,
		],
		flags: {
			hasRateLimit: true,
			isShowable: true,
		},
	},
	message: {
		id: "translate.message",
		type: Discord.ApplicationCommandTypes.Message,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleTranslateMessage,
		flags: {
			isShowable: true,
		},
	},
} satisfies Record<string, CommandTemplate>;

async function handleTranslateChatInputAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { to: string; from: string }>,
): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guild = client.entities.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	if (
		interaction.parameters.focused === undefined ||
		interaction.parameters[interaction.parameters.focused] === undefined
	) {
		return;
	}

	const languageQueryTrimmed = interaction.parameters[interaction.parameters.focused].trim();
	if (languageQueryTrimmed.length === 0) {
		const strings = {
			autocomplete: client.localise("autocomplete.language", locale)(),
		};

		client.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]);
		return;
	}

	const languageQueryLowercase = languageQueryTrimmed.toLowerCase();
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
				language: client.localise(languageStringKey, locale)(),
			};

			return {
				name: strings.language,
				value: language,
			};
		})
		.filter((choice) => choice.name?.toLowerCase().includes(languageQueryLowercase))
		.slice(0, 25)
		.sort((previous, next) => previous.name.localeCompare(next.name));

	client.respond(interaction, choices);
}

async function handleTranslateChatInput(
	client: Client,
	interaction: Logos.Interaction<any, { text: string; from: string | undefined; to: string | undefined }>,
): Promise<void> {
	handleTranslate(client, interaction, interaction.parameters);
}

async function handleTranslateMessage(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const message = interaction.data?.resolved?.messages?.array()?.at(0);
	if (message === undefined) {
		return;
	}

	const hasEmbeds = message.embeds !== undefined && message.embeds.length !== 0;
	if (hasEmbeds) {
		const strings = {
			title: client.localise("translate.strings.cannotUse.title", locale)(),
			description: client.localise("translate.strings.cannotUse.description", locale)(),
		};

		client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colours.dullYellow,
				},
			],
		});
		return;
	}

	handleTranslate(client, interaction, { text: message.content });
}

async function handleTranslate(
	client: Client,
	interaction: Logos.Interaction,
	{ text, from, to }: { text: string; from?: string; to?: string },
): Promise<void> {
	const language = interaction.parameters.show ? interaction.guildLanguage : interaction.language;
	const locale = interaction.parameters.show ? interaction.guildLocale : interaction.locale;

	const isTextEmpty = text.trim().length === 0;
	if (isTextEmpty) {
		const locale = interaction.locale;

		const strings = {
			title: client.localise("translate.strings.textEmpty.title", locale)(),
			description: client.localise("translate.strings.textEmpty.description", locale)(),
		};

		client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colours.dullYellow,
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
					title: client.localise("translate.strings.invalid.both.title", locale)(),
					description: client.localise("translate.strings.invalid.both.description", locale)(),
				},
			};

			client.reply(interaction, {
				embeds: [
					{
						title: strings.both.title,
						description: strings.both.description,
						color: constants.colours.red,
					},
				],
			});

			return;
		}

		if (isSourceInvalid) {
			const strings = {
				source: {
					title: client.localise("translate.strings.invalid.source.title", locale)(),
					description: client.localise("translate.strings.invalid.source.description", locale)(),
				},
			};

			client.reply(interaction, {
				embeds: [
					{
						title: strings.source.title,
						description: strings.source.description,
						color: constants.colours.red,
					},
				],
			});

			return;
		}

		if (isTargetInvalid) {
			const strings = {
				target: {
					title: client.localise("translate.strings.invalid.target.title", locale)(),
					description: client.localise("translate.strings.invalid.target.description", locale)(),
				},
			};

			client.reply(interaction, {
				embeds: [
					{
						title: strings.target.title,
						description: strings.target.description,
						color: constants.colours.red,
					},
				],
			});

			return;
		}

		if (from !== undefined && to !== undefined) {
			if (from === to) {
				const locale = interaction.locale;

				const strings = {
					title: client.localise("translate.strings.languagesNotDifferent.title", locale)(),
					description: client.localise("translate.strings.languagesNotDifferent.description", locale)(),
				};

				client.reply(interaction, {
					embeds: [
						{
							title: strings.title,
							description: strings.description,
							color: constants.colours.dullYellow,
						},
					],
				});
				return;
			}

			translateText(client, interaction, { text, languages: { source: from, target: to } }, { locale });
			return;
		}

		if (from === undefined) {
			const detectedLanguage = await detectLanguage(client, interaction, { text });
			if (detectedLanguage === undefined) {
				return;
			}

			sourceLanguage = detectedLanguage;
		} else {
			sourceLanguage = from;
		}
	} else {
		const detectedLanguage = await detectLanguage(client, interaction, { text });
		if (detectedLanguage === undefined) {
			return;
		}

		sourceLanguage = detectedLanguage;
	}

	if (to !== undefined) {
		if (to !== sourceLanguage) {
			translateText(client, interaction, { text, languages: { source: sourceLanguage, target: to } }, { locale });
			return;
		}
	}

	const learningTranslationLanguage = getTranslationLanguage(interaction.learningLanguage);
	if (learningTranslationLanguage !== undefined) {
		if (learningTranslationLanguage !== sourceLanguage) {
			translateText(
				client,
				interaction,
				{ text, languages: { source: sourceLanguage, target: learningTranslationLanguage } },
				{ locale },
			);
			return;
		}
	}

	const translationLanguage = getTranslationLanguage(language);
	if (translationLanguage === undefined) {
		const locale = interaction.locale;

		const strings = {
			title: client.localise("translate.strings.cannotDetermine.target.title", locale)(),
			description: {
				cannotDetermine: client.localise(
					"translate.strings.cannotDetermine.target.description.cannotDetermine",
					locale,
				)(),
				tryAgain: client.localise("translate.strings.cannotDetermine.target.description.tryAgain", locale)(),
			},
		};

		client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: `${strings.description.cannotDetermine}\n\n${strings.description.tryAgain}`,
					color: constants.colours.peach,
				},
			],
		});

		return;
	}

	if (translationLanguage === sourceLanguage) {
		const locale = interaction.locale;

		const strings = {
			title: client.localise("translate.strings.cannotDetermine.target.title", locale)(),
			description: {
				cannotDetermine: client.localise(
					"translate.strings.cannotDetermine.target.description.cannotDetermine",
					locale,
				)(),
				tryAgain: client.localise("translate.strings.cannotDetermine.target.description.tryAgain", locale)(),
			},
		};

		client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: `${strings.description.cannotDetermine}\n\n${strings.description.tryAgain}`,
					color: constants.colours.peach,
				},
			],
		});

		return;
	}

	translateText(
		client,
		interaction,
		{ text, languages: { source: sourceLanguage, target: translationLanguage } },
		{ locale },
	);
}

async function translateText(
	client: Client,
	interaction: Logos.Interaction,
	{ text, languages }: { text: string; languages: Languages<TranslationLanguage> },
	{ locale }: { locale: Locale },
): Promise<void> {
	const adapters = resolveAdapters(languages);
	if (adapters === undefined || adapters.length === 0) {
		const strings = {
			title: client.localise("translate.strings.noTranslationAdapters.title", locale)(),
			description: client.localise("translate.strings.noTranslationAdapters.description", locale)(),
		};

		client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colours.yellow,
				},
			],
		});
		return;
	}

	await client.postponeReply(interaction, { visible: interaction.parameters.show });

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
			title: client.localise("translate.strings.failed.title", locale)(),
			description: client.localise("translate.strings.failed.description", locale)(),
		};

		client.editReply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colours.red,
				},
			],
		});
		return;
	}

	// Ensures that an empty translation string does not result in embed failure.
	const translatedText = translation.text.trim().length !== 0 ? translation.text : constants.special.meta.whitespace;

	const strings = {
		languages: {
			source: client.localise(localisations.languages[languages.source], locale)(),
			target: client.localise(localisations.languages[languages.target], locale)(),
		},
		sourceText: client.localise("translate.strings.sourceText", locale)(),
		translation: client.localise("translate.strings.translation", locale)(),
	};

	const isLong = text.length > 896; // 7/8 of 1024. Leaves room for text overhead.

	let embeds: Discord.CamelizedDiscordEmbed[] = [];
	if (isLong) {
		embeds = [
			{
				color: constants.colours.blue,
				title: strings.sourceText,
				description: text,
			},
			{
				color: constants.colours.blue,
				title: strings.translation,
				description: translatedText,
				footer: {
					text: `${strings.languages.source} ${constants.emojis.indicators.arrowRight} ${strings.languages.target}`,
				},
			},
		];
	} else {
		embeds = [
			{
				color: constants.colours.blue,
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
					text: `${strings.languages.source} ${constants.emojis.indicators.arrowRight} ${strings.languages.target}`,
				},
			},
		];
	}

	const components: Discord.ActionRow[] | undefined = interaction.parameters.show
		? undefined
		: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [client.interactionRepetitionService.getShowButton(interaction, { locale })],
				},
		  ];

	client.editReply(interaction, { embeds, components });
}

async function detectLanguage(
	client: Client,
	interaction: Logos.Interaction,
	{ text }: { text: string },
): Promise<TranslationLanguage | undefined> {
	const detectionResult = (await detectLanguages({ text })).likely.at(0);
	if (detectionResult === undefined) {
		const locale = interaction.locale;

		const strings = {
			title: client.localise("translate.strings.cannotDetermine.source.title", locale)(),
			description: {
				cannotDetermine: client.localise(
					"translate.strings.cannotDetermine.source.description.cannotDetermine",
					locale,
				)(),
				tryAgain: client.localise("translate.strings.cannotDetermine.source.description.tryAgain", locale)(),
			},
		};

		client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: `${strings.description.cannotDetermine}\n\n${strings.description.tryAgain}`,
					color: constants.colours.peach,
				},
			],
		});

		return undefined;
	}

	const detectedLanguage = getTranslationLanguage(detectionResult);
	if (detectedLanguage === undefined) {
		const locale = interaction.locale;

		const strings = {
			title: client.localise("translate.strings.languageNotSupported.title", locale)(),
			description: client.localise("translate.strings.languageNotSupported.description", locale)(),
		};

		client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colours.dullYellow,
				},
			],
		});

		return undefined;
	}

	return detectedLanguage;
}

export default commands;
