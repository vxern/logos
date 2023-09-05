import constants from "../../../../constants/constants";
import languages, { Languages, TranslationLanguage, isTranslationLanguage } from "../../../../constants/languages";
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

const command: CommandTemplate = {
	name: "translate",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	isRateLimited: true,
	handle: handleTranslateText,
	handleAutocomplete: handleTranslateTextAutocomplete,
	options: [
		{
			name: "from",
			type: Discord.ApplicationCommandOptionTypes.String,
			required: true,
			autocomplete: true,
		},
		{
			name: "to",
			type: Discord.ApplicationCommandOptionTypes.String,
			required: true,
			autocomplete: true,
		},
		{
			name: "text",
			type: Discord.ApplicationCommandOptionTypes.String,
			required: true,
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
	if (from === undefined || to === undefined || text === undefined) {
		return;
	}

	const show = interaction.show ?? showParameter ?? false;
	const locale = show ? interaction.guildLocale : interaction.locale;

	const sourceLanguage = from;
	const targetLanguage = to;
	const isSourceLanguageInvalid = !isTranslationLanguage(sourceLanguage);
	const isTargetLanguageInvalid = !isTranslationLanguage(targetLanguage);
	if (isSourceLanguageInvalid || isTargetLanguageInvalid) {
		const locale = interaction.locale;
		const strings = {
			source: {
				title: localise(client, "translate.strings.invalid.source.title", locale)(),
				description: localise(client, "translate.strings.invalid.source.description", locale)(),
			},
			target: {
				title: localise(client, "translate.strings.invalid.target.title", locale)(),
				description: localise(client, "translate.strings.invalid.target.description", locale)(),
			},
			both: {
				title: localise(client, "translate.strings.invalid.both.title", locale)(),
				description: localise(client, "translate.strings.invalid.both.description", locale)(),
			},
		};

		const areBothLanguagesInvalid = isSourceLanguageInvalid && isTargetLanguageInvalid;

		reply([client, bot], interaction, {
			embeds: [
				{
					...(areBothLanguagesInvalid
						? {
								title: strings.both.title,
								description: strings.both.description,
						  }
						: isSourceLanguageInvalid
						? {
								title: strings.source.title,
								description: strings.source.description,
						  }
						: {
								title: strings.target.title,
								description: strings.target.description,
						  }),
					color: constants.colors.red,
				},
			],
		});
		return;
	}

	const isSourceTextEmpty = text.trim().length === 0;
	if (isSourceTextEmpty) {
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

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const languages: Languages<TranslationLanguage> = { source: sourceLanguage, target: targetLanguage };

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
