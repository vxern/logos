import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	ApplicationCommandTypes,
	Bot,
	editOriginalInteractionResponse,
	Embed,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { resolveToSupportedLanguage } from 'logos/src/commands/language/module.ts';
import { CommandTemplate } from 'logos/src/commands/command.ts';
import { show } from 'logos/src/commands/parameters.ts';
import { Client, localise } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import { addParametersToURL, diagnosticMentionUser } from 'logos/src/utils.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from '../../../../types.ts';

const command: CommandTemplate = {
	name: 'translate',
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	isRateLimited: true,
	handle: handleTranslateText,
	handleAutocomplete: handleTranslateTextAutocomplete,
	options: [{
		name: 'from',
		type: ApplicationCommandOptionTypes.String,
		required: true,
		autocomplete: true,
	}, {
		name: 'to',
		type: ApplicationCommandOptionTypes.String,
		required: true,
		autocomplete: true,
	}, {
		name: 'text',
		type: ApplicationCommandOptionTypes.String,
		required: true,
	}, show],
};

const languageNameToStringKey: Record<string, string> = Object.freeze({
	'Armenian': 'languages.armenian',
	'Belarusian': 'languages.belarusian',
	'Bulgarian': 'languages.bulgarian',
	'Chinese': 'languages.chinese',
	'Chinese (simplified)': 'languages.chinese.simplified',
	'Czech': 'languages.czech',
	'Danish': 'languages.danish',
	'Dutch': 'languages.dutch',
	'English': 'languages.english',
	'English (American)': 'languages.english.american',
	'English (British)': 'languages.english.british',
	'Estonian': 'languages.estonian',
	'Finnish': 'languages.finnish',
	'French': 'languages.french',
	'German': 'languages.german',
	'Greek': 'languages.greek',
	'Hungarian': 'languages.hungarian',
	'Indonesian': 'languages.indonesian',
	'Italian': 'languages.italian',
	'Japanese': 'languages.japanese',
	'Korean': 'languages.korean',
	'Latvian': 'languages.latvian',
	'Lithuanian': 'languages.lithuanian',
	'Norwegian': 'languages.norwegian',
	'Norwegian (Bokmål)': 'languages.norwegian.bokmal',
	'Polish': 'languages.polish',
	'Portuguese': 'languages.portuguese',
	'Portuguese (Brazilian)': 'languages.portuguese.brazilian',
	'Portuguese (European)': 'languages.portuguese.european',
	'Romanian': 'languages.romanian',
	'Russian': 'languages.russian',
	'Slovak': 'languages.slovak',
	'Slovenian': 'languages.slovenian',
	'Spanish': 'languages.spanish',
	'Swedish': 'languages.swedish',
	'Turkish': 'languages.turkish',
	'Ukrainian': 'languages.ukrainian',
});

async function handleTranslateTextAutocomplete([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [_, focused] = parseArguments(interaction.data?.options, { show: 'boolean' });

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	if (focused === undefined || focused.value === undefined) return;

	const inputLowercase = (focused.value as string).toLowerCase();

	const choices = client.metadata.supportedTranslationLanguages
		.map((language) => {
			const key = languageNameToStringKey[language.name];

			return {
				name: key !== undefined ? localise(client, key, interaction.locale)() : language.name,
				value: language.code,
			};
		})
		.filter((choice) => choice.name && choice.name.toLowerCase().includes(inputLowercase))
		.slice(0, 25)
		.toSorted((previous, next) => previous.name.localeCompare(next.name));

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
			data: { choices },
		},
	);
}

/** Allows the user to translate text from one language to another through the DeepL API. */
async function handleTranslateText([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ from, to, text, show }] = parseArguments(interaction.data?.options, { show: 'boolean' });
	if (from === undefined || to === undefined || text === undefined) return;

	if (from === to) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(
							client,
							'translate.strings.targetLanguageMustBeDifferentFromSource',
							interaction.locale,
						)(),
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
	}

	const isSourceTextEmpty = text.trim().length === 0;
	if (isSourceTextEmpty) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(client, 'translate.strings.textCannotBeEmpty', interaction.locale)(),
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
	}

	const sourceLanguage = resolveToSupportedLanguage(client, from);
	const targetLanguage = resolveToSupportedLanguage(client, to);
	if (sourceLanguage === undefined || targetLanguage === undefined) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: sourceLanguage === undefined
							? (
								targetLanguage === undefined
									? localise(client, 'translate.strings.invalid.both', interaction.locale)()
									: localise(client, 'translate.strings.invalid.source', interaction.locale)()
							)
							: localise(client, 'translate.strings.invalid.target', interaction.locale)(),
						color: constants.colors.red,
					}],
				},
			},
		);
	}

	await sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.DeferredChannelMessageWithSource,
			data: { flags: !show ? ApplicationCommandFlags.Ephemeral : undefined },
		},
	);

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	client.log.info(
		`Translating a text of length ${text.length} from ${sourceLanguage.name} to ${targetLanguage.name} ` +
			`as requested by ${diagnosticMentionUser(interaction.user, true)} on ${guild.name}...`,
	);

	const locale = show ? defaultLocale : interaction.locale;

	const translation = await translate(sourceLanguage.code, targetLanguage.code, text);
	if (translation === undefined) {
		return void editOriginalInteractionResponse(
			bot,
			interaction.token,
			{
				embeds: [{
					description: localise(client, 'translate.strings.failed', locale)(),
					color: constants.colors.red,
				}],
			},
		);
	}

	// Ensures that an empty translation string does not result in embed failure.
	const translatedText = translation.text.trim().length !== 0 ? translation.text : constants.symbols.meta.whitespace;

	const sourceLanguageKey = languageNameToStringKey[sourceLanguage.name];
	const sourceLanguageName = sourceLanguageKey !== undefined
		? localise(client, sourceLanguageKey, locale)()
		: sourceLanguage.name;
	const targetLanguageKey = languageNameToStringKey[targetLanguage.name];
	const targetLanguageName = targetLanguageKey !== undefined
		? localise(client, targetLanguageKey, locale)()
		: targetLanguage.name;

	const isLong = text.length > 896; // 7/8 of 1024. Leaves room for text overhead.

	const translationIndicator = `${sourceLanguageName} ${constants.symbols.indicators.arrowRight} ${targetLanguageName}`;

	let embeds: Embed[] = [];
	if (!isLong) {
		embeds = [{
			color: constants.colors.blue,
			fields: [{
				name: localise(client, 'translate.strings.sourceText', locale)(),
				value: text,
				inline: false,
			}, {
				name: localise(client, 'translate.strings.translation', locale)(),
				value: translatedText,
				inline: false,
			}],
			footer: { text: translationIndicator },
		}];
	} else {
		embeds = [{
			color: constants.colors.blue,
			title: localise(client, 'translate.strings.sourceText', locale)(),
			description: text,
		}, {
			color: constants.colors.blue,
			title: localise(client, 'translate.strings.translation', locale)(),
			description: translatedText,
			footer: { text: translationIndicator },
		}];
	}

	return void editOriginalInteractionResponse(bot, interaction.token, { embeds });
}

interface DeepLTranslation {
	'detected_source_language': string;
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
	sourceLanguageCode: string,
	targetLanguageCode: string,
	text: string,
): Promise<Translation | undefined> {
	const sourceLanguageCodeBase = sourceLanguageCode.split('-').at(0)!;

	const response = await fetch(
		addParametersToURL(constants.endpoints.deepl.translate, {
			'auth_key': Deno.env.get('DEEPL_SECRET')!,
			'text': text,
			'source_lang': sourceLanguageCodeBase,
			'target_lang': targetLanguageCode,
		}),
	);
	if (!response.ok) return;

	const results = (await response.json() as TranslationResult).translations;
	if (results.length === 0) return;

	const result = results.at(0)!;
	return {
		detectedSourceLanguage: result.detected_source_language,
		text: result.text,
	};
}

export default command;
