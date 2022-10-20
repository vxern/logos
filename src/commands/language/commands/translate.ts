// deno-lint-ignore-file camelcase
import 'dotenv_load';
import { Commands } from '../../../../assets/localisations/commands.ts';
import {
	getLocalisations,
} from '../../../../assets/localisations/languages.ts';
import {
	createLocalisations,
	localise,
} from '../../../../assets/localisations/types.ts';
import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	editOriginalInteractionResponse,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	sendInteractionResponse,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { deepLApiEndpoints } from '../../../constants.ts';
import { show } from '../../parameters.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.translate),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: translate,
	options: [{
		...createLocalisations(Commands.translate.options.from),
		type: ApplicationCommandOptionTypes.String,
		required: true,
		autocomplete: true,
	}, {
		...createLocalisations(Commands.translate.options.to),
		type: ApplicationCommandOptionTypes.String,
		required: true,
		autocomplete: true,
	}, {
		...createLocalisations(Commands.translate.options.text),
		type: ApplicationCommandOptionTypes.String,
		required: true,
	}, show],
};

interface DeepLSupportedLanguage {
	language: string;
	name: string;
	supports_formality: boolean;
}

/** Represents a supported language object sent by DeepL. */
interface SupportedLanguage {
	/** The language name */
	name: string;

	/** The language code. */
	code: string;

	/** Whether the formality option is supported for this language. */
	supportsFormality: boolean;
}

const deepLSecret = Deno.env.get('DEEPL_SECRET')!;

const supportedLanguages = await getSupportedLanguages();
const supportedLanguagesChoices = supportedLanguages.map((language) => ({
	name: getLocalisations(language.name),
	value: language.code,
}));

async function getSupportedLanguages(): Promise<SupportedLanguage[]> {
	const response = await fetch(
		addParametersToURL(deepLApiEndpoints.languages, {
			'auth_key': deepLSecret,
			'type': 'target',
		}),
	);
	if (!response.ok) return [];

	const results = <DeepLSupportedLanguage[]> await response.json().catch(
		() => [],
	);

	return results.map((result) => ({
		name: result.name,
		code: result.language,
		supportsFormality: result.supports_formality,
	}));
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

async function getTranslation(
	sourceLanguageCode: string,
	targetLanguageCode: string,
	text: string,
): Promise<Translation | undefined> {
	const sourceLanguageCodeBase = sourceLanguageCode.split('-').at(0)!;

	const response = await fetch(
		addParametersToURL(deepLApiEndpoints.translate, {
			'auth_key': deepLSecret,
			'text': text,
			'source_lang': sourceLanguageCodeBase,
			'target_lang': targetLanguageCode,
		}),
	);
	if (!response.ok) return;

	const results =
		(<{ translations: DeepLTranslation[] }> await response.json()).translations;
	if (results.length !== 1) return;

	const result = results.at(0)!;
	return {
		detectedSourceLanguage: result.detected_source_language,
		text: result.text,
	};
}

function resolveToSupportedLanguage(
	languageOrCode: string,
): SupportedLanguage | undefined {
	const languageOrCodeLowercase = languageOrCode.toLowerCase();
	return supportedLanguages.find((language) =>
		language.code.toLowerCase() === languageOrCodeLowercase ||
		language.name.toLowerCase() === languageOrCode
	);
}

/** Allows the user to translate text from one language to another through the DeepL API. */
async function translate(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (!guild) return;

	if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
		const input = <string | undefined> interaction.data?.options?.find((
			option,
		) => option.focused)?.value;
		if (input === undefined) return;

		let languages;
		if (input.length === 0) {
			languages = supportedLanguagesChoices.slice(0, 25);
		} else {
			const inputLowercase = input.toLowerCase();
			languages = supportedLanguagesChoices.filter((language) =>
				localise(language.name, interaction.locale).toLowerCase().includes(
					inputLowercase,
				)
			);
		}

		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
				data: {
					choices: languages.map((language) => ({
						name: localise(language.name, interaction.locale),
						value: language.value,
					})),
				},
			},
		);
	}

	const data = interaction.data;
	if (!data) return;

	const sourceLanguageOrCode = <string | undefined> data.options?.at(0)?.value;
	const targetLanguageOrCode = <string | undefined> data.options?.at(1)?.value;
	const text = <string | undefined> data.options?.at(2)?.value;
	if (!(sourceLanguageOrCode && targetLanguageOrCode && text)) return;

	if (sourceLanguageOrCode === targetLanguageOrCode) {
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
							Commands.translate.strings
								.targetLanguageMustBeDifferentFromSource,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.yellow,
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
						description: localise(
							Commands.translate.strings.textCannotBeEmpty,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	const sourceLanguage = resolveToSupportedLanguage(sourceLanguageOrCode);
	const targetLanguage = resolveToSupportedLanguage(targetLanguageOrCode);
	if (!sourceLanguage || !targetLanguage) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: !sourceLanguage
							? (
								!targetLanguage
									? localise(
										Commands.translate.strings.invalid.both,
										interaction.locale,
									)
									: localise(
										Commands.translate.strings.invalid.source,
										interaction.locale,
									)
							)
							: localise(
								Commands.translate.strings.invalid.target,
								interaction.locale,
							),
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	const show =
		<boolean> data.options?.find((option) => option.name === 'show')?.value ??
			false;

	await sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.DeferredChannelMessageWithSource,
			data: { flags: !show ? ApplicationCommandFlags.Ephemeral : undefined },
		},
	);

	const translation = await getTranslation(
		sourceLanguage.code,
		targetLanguage.code,
		text,
	);
	if (!translation) {
		return void editOriginalInteractionResponse(
			bot,
			interaction.token,
			{
				embeds: [{
					description: localise(
						Commands.translate.strings.failed,
						interaction.locale,
					),
					color: configuration.interactions.responses.colors.red,
				}],
			},
		);
	}

	// Ensures that an empty translation string doesn't result in embed failure.
	const translatedText = translation.text.trim().length !== 0
		? translation.text
		: '⠀';

	const sourceLanguageName = localise(
		getLocalisations(sourceLanguage.name),
		interaction.locale,
	);
	const targetLanguageName = localise(
		getLocalisations(targetLanguage.name),
		interaction.locale,
	);

	return void editOriginalInteractionResponse(
		bot,
		interaction.token,
		{
			embeds: [{
				title: `${sourceLanguageName} → ${targetLanguageName}`,
				color: configuration.interactions.responses.colors.blue,
				fields: [{
					name: sourceLanguageName,
					value: text,
					inline: false,
				}, {
					name: targetLanguageName,
					value: translatedText,
					inline: false,
				}],
			}],
		},
	);
}

/**
 * Taking a URL and a list of parameters, returns the URL with the parameters appended
 * to it.
 *
 * @param url - The URL to format.
 * @param parameters - The parameters to append to the URL.
 * @returns The formatted URL.
 */
function addParametersToURL(
	url: string,
	parameters: Record<string, string>,
): string {
	const query = Object.entries(parameters)
		.map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
		.join('&');

	return `${url}?${query}`;
}

export default command;
