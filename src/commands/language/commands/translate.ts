// deno-lint-ignore-file camelcase
import {
	ApplicationCommandFlags,
	ApplicationCommandOptionChoice,
	ApplicationCommandOptionTypes,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	sendInteractionResponse,
} from '../../../../deps.ts';
import secrets from '../../../../secrets.ts';
import { Client } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { deepLApiEndpoints } from '../../../constants.ts';

const command: CommandBuilder = {
	name: 'translate',
	nameLocalizations: {
		pl: 'przetłumacz',
		ro: 'traduce',
	},
	description:
		'Translates a text from the source language to the target language.',
	descriptionLocalizations: {
		pl: 'Tłumaczy dany tekst z języka źródłowego na język docelowy.',
		ro: 'Traduce un text dat din limba-sursă în limba-țintă.',
	},
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: translate,
	options: [{
		name: 'from',
		nameLocalizations: {
			pl: 'z',
			ro: 'din',
		},
		description: 'The source language.',
		descriptionLocalizations: {
			pl: 'Język źródłowy.',
			ro: 'Limbă-sursă.',
		},
		type: ApplicationCommandOptionTypes.String,
		required: true,
		autocomplete: true,
	}, {
		name: 'to',
		nameLocalizations: {
			pl: 'na',
			ro: 'în',
		},
		description: 'The target language.',
		descriptionLocalizations: {
			pl: 'Język docelowy.',
			ro: 'Limbă-țintă.',
		},
		type: ApplicationCommandOptionTypes.String,
		required: true,
		autocomplete: true,
	}, {
		name: 'text',
		nameLocalizations: {
			pl: 'tekst',
			ro: 'text',
		},
		description: 'The text to translate.',
		descriptionLocalizations: {
			pl: 'Tekst do przetłumaczenia.',
			ro: 'Text de tradus.',
		},
		type: ApplicationCommandOptionTypes.String,
		required: true,
	}, {
		name: 'show',
		nameLocalizations: {
			pl: 'wyświetl',
			ro: 'afișează',
		},
		description:
			'If set to true, the translation will be shown to other users.',
		descriptionLocalizations: {
			pl: 'Jeśli tak, tłumaczenie będzie wyświetlone innym użytkownikom.',
			ro: 'Dacă da, traducerea va fi afișată altor utilizatori.',
		},
		type: ApplicationCommandOptionTypes.Boolean,
	}],
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

const supportedLanguages = await getSupportedLanguages();
const supportedLanguagesChoices = supportedLanguages.map<
	ApplicationCommandOptionChoice
>((language) => ({
	name: language.name,
	value: language.code,
}));

async function getSupportedLanguages(): Promise<SupportedLanguage[]> {
	const response = await fetch(
		addParametersToURL(deepLApiEndpoints.languages, {
			'auth_key': secrets.modules.language.deepL.secret,
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
			'auth_key': secrets.modules.language.deepL.secret,
			'text': text,
			'source_lang': sourceLanguageCodeBase,
			'target_lang': targetLanguageCode,
		}),
	);
	if (!response.ok) return;

	const results =
		(<{ translations: DeepLTranslation[] }> await response.json()).translations;
	if (results.length !== 1) return;

	const result = results[0]!;
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
	client: Client,
	interaction: Interaction,
): Promise<void> {
	if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
		const input = <string | undefined> interaction.data?.options?.find((
			option,
		) => option.focused)?.value;
		if (input === undefined) return;

		let choices: ApplicationCommandOptionChoice[];
		if (input.length === 0) {
			choices = supportedLanguagesChoices.slice(0, 25);
		} else {
			const inputLowercase = input.toLowerCase();
			choices = supportedLanguagesChoices.filter((language) =>
				language.name.toLowerCase().includes(inputLowercase)
			);
		}

		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
				data: { choices },
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
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description:
							'The target language may not be the same as the source language.',
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	const isSourceTextEmpty = text.trim().length === 0;
	if (isSourceTextEmpty) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: 'The source text may not be empty.',
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
			client.bot,
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
									? 'Both the source language and the target language are invalid.'
									: 'The source language is invalid.'
							)
							: 'The target language is invalid.',
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
		client.bot,
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
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					embeds: [{
						description: 'Failed to translate text.',
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	// Ensures that an empty translation string doesn't result in embed failure.
	const translatedText = translation.text.trim().length !== 0
		? translation.text
		: '⠀';

	return void sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: `${sourceLanguage.name} → ${targetLanguage.name}`,
					color: configuration.interactions.responses.colors.blue,
					fields: [{
						name: sourceLanguage.name,
						value: text,
						inline: false,
					}, {
						name: targetLanguage.name,
						value: translatedText,
						inline: false,
					}],
				}],
			},
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
