import constants from "../../../../constants/constants";
import { defaultLocale } from "../../../../types";
import { Client, localise } from "../../../client";
import { editReply, parseArguments, postponeReply, reply, respond } from "../../../interactions";
import { addParametersToURL, diagnosticMentionUser } from "../../../utils";
import { CommandTemplate } from "../../command";
import { show } from "../../parameters";
import { resolveToSupportedLanguage } from "../module";
import * as Discord from "discordeno";

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

const languageNameToStringKey: Record<string, string> = Object.freeze({
	Armenian: "languages.armenian",
	Belarusian: "languages.belarusian",
	Bulgarian: "languages.bulgarian",
	Chinese: "languages.chinese",
	"Chinese (simplified)": "languages.chinese.simplified",
	Czech: "languages.czech",
	Danish: "languages.danish",
	Dutch: "languages.dutch",
	English: "languages.english",
	"English (American)": "languages.english.american",
	"English (British)": "languages.english.british",
	Estonian: "languages.estonian",
	Finnish: "languages.finnish",
	French: "languages.french",
	German: "languages.german",
	Greek: "languages.greek",
	Hungarian: "languages.hungarian",
	Indonesian: "languages.indonesian",
	Italian: "languages.italian",
	Japanese: "languages.japanese",
	Korean: "languages.korean",
	Latvian: "languages.latvian",
	Lithuanian: "languages.lithuanian",
	Norwegian: "languages.norwegian",
	"Norwegian (Bokmål)": "languages.norwegian.bokmal",
	Polish: "languages.polish",
	Portuguese: "languages.portuguese",
	"Portuguese (Brazilian)": "languages.portuguese.brazilian",
	"Portuguese (European)": "languages.portuguese.european",
	Romanian: "languages.romanian",
	Russian: "languages.russian",
	Slovak: "languages.slovak",
	Slovenian: "languages.slovenian",
	Spanish: "languages.spanish",
	Swedish: "languages.swedish",
	Turkish: "languages.turkish",
	Ukrainian: "languages.ukrainian",
});

async function handleTranslateTextAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
): Promise<void> {
	const [_, focused] = parseArguments(interaction.data?.options, { show: "boolean" });

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

	const choices = client.metadata.supportedTranslationLanguages
		.map((language) => {
			const languageStringKey = languageNameToStringKey[language.name];

			if (languageStringKey === undefined) {
				return {
					name: language.name,
					value: language.code,
				};
			}

			const strings = {
				language: localise(client, languageStringKey, interaction.locale)(),
			};

			return {
				name: strings.language,
				value: language.code,
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
	interaction: Discord.Interaction,
): Promise<void> {
	const [{ from, to, text, show }] = parseArguments(interaction.data?.options, { show: "boolean" });
	if (from === undefined || to === undefined || text === undefined) {
		return;
	}

	const sourceLanguage = resolveToSupportedLanguage(client, from);
	const targetLanguage = resolveToSupportedLanguage(client, to);
	const isSourceLanguageInvalid = sourceLanguage === undefined;
	const isTargetLanguageInvalid = targetLanguage === undefined;
	if (isSourceLanguageInvalid || isTargetLanguageInvalid) {
		const strings = {
			source: {
				title: localise(client, "translate.strings.invalid.source.title", interaction.locale)(),
				description: localise(client, "translate.strings.invalid.source.description", interaction.locale)(),
			},
			target: {
				title: localise(client, "translate.strings.invalid.target.title", interaction.locale)(),
				description: localise(client, "translate.strings.invalid.target.description", interaction.locale)(),
			},
			both: {
				title: localise(client, "translate.strings.invalid.both.title", interaction.locale)(),
				description: localise(client, "translate.strings.invalid.both.description", interaction.locale)(),
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
		const strings = {
			title: localise(client, "translate.strings.textEmpty.title", interaction.locale)(),
			description: localise(client, "translate.strings.textEmpty.description", interaction.locale)(),
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
		const strings = {
			title: localise(client, "translate.strings.languagesNotDifferent.title", interaction.locale)(),
			description: localise(client, "translate.strings.languagesNotDifferent.description", interaction.locale)(),
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

	await postponeReply([client, bot], interaction, { visible: show });

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	client.log.info(
		`Translating a text of length ${text.length} from ${sourceLanguage.name} to ${
			targetLanguage.name
		} as requested by ${diagnosticMentionUser(interaction.user)} on ${guild.name}...`,
	);

	const locale = show ? defaultLocale : interaction.locale;

	const translation = await translate(client, sourceLanguage.code, targetLanguage.code, text);
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

	const sourceLanguageKey = languageNameToStringKey[sourceLanguage.name];
	const targetLanguageKey = languageNameToStringKey[targetLanguage.name];

	const strings = {
		sourceLanguageName:
			sourceLanguageKey !== undefined ? localise(client, sourceLanguageKey, locale)() : sourceLanguage.name,
		targetLanguageName:
			targetLanguageKey !== undefined ? localise(client, targetLanguageKey, locale)() : targetLanguage.name,
		sourceText: localise(client, "translate.strings.sourceText", locale)(),
		translation: localise(client, "translate.strings.translation", locale)(),
	};

	const isLong = text.length > 896; // 7/8 of 1024. Leaves room for text overhead.

	const translationIndicator = `${strings.sourceLanguageName} ${constants.symbols.indicators.arrowRight} ${strings.targetLanguageName}`;

	let embeds: Discord.Embed[] = [];
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
				footer: { text: translationIndicator },
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
				footer: { text: translationIndicator },
			},
		];
	}

	editReply([client, bot], interaction, { embeds });
}

interface DeepLTranslation {
	detected_source_language: string;
	text: string;
}

/** Represents a response to a translation query. */
interface Translation {
	/** The language detected from the text sent to be translated. */
	detectedSourceLanguage: string;

	/** The translated text. */
	text: string;
}

interface TranslationResult {
	translations: DeepLTranslation[];
}

async function translate(
	client: Client,
	sourceLanguageCode: string,
	targetLanguageCode: string,
	text: string,
): Promise<Translation | undefined> {
	const [sourceLanguage, _] = sourceLanguageCode.split("-");
	if (sourceLanguage === undefined) {
		return undefined;
	}

	const response = await fetch(
		addParametersToURL(constants.endpoints.deepl.translate, {
			auth_key: client.metadata.environment.deeplSecret,
			text: text,
			source_lang: sourceLanguage,
			target_lang: targetLanguageCode,
		}),
	);
	if (!response.ok) {
		return undefined;
	}

	const results = ((await response.json()) as TranslationResult).translations;
	const result = results.at(0);
	if (result === undefined) {
		return undefined;
	}

	return {
		detectedSourceLanguage: result.detected_source_language,
		text: result.text,
	};
}

export default command;
export { languageNameToStringKey };
