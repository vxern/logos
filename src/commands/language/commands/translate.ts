import {
	ApplicationCommandFlags,
	ApplicationCommandOptionChoice,
	ApplicationCommandOptionTypes,
	editInteractionResponse,
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
			pl: 'wyświetlić-innym',
			ro: 'arată-le-celorlalți',
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

/** Represents a response to a translation query. */
interface Translation {
	/** The language detected from the text sent to be translated. */
	// deno-lint-ignore camelcase
	detected_source_language: string;

	/** The translated text. */
	text: string;
}

/** Represents a supported language object sent by DeepL. */
interface SupportedLanguage {
	/** The language code. */
	language: string;

	/** The language name */
	name: string;

	/** Whether the formality option is supported for this language. */
	// deno-lint-ignore camelcase
	supports_formality: boolean;
}

const supportedLanguagesResponse = await fetch(
	addParametersToURL(deepLApiEndpoints.languages, {
		'auth_key': secrets.modules.language.deepL.secret,
		'type': 'target',
	}),
);
const supportedLanguagesRaw: SupportedLanguage[] = supportedLanguagesResponse.ok
	? await supportedLanguagesResponse.json()
	: [];
const supportedLanguages: SupportedLanguage[] = supportedLanguagesRaw
	.filter((supportedLanguage, index, array) =>
		index ===
			array.findIndex((language) =>
				language.language.startsWith(supportedLanguage.language.split('-')[0]!)
			)
	);
// TODO: Do not combine language variants into single choices.
const supportedLanguagesChoices: ApplicationCommandOptionChoice[] =
	supportedLanguages
		.map(
			(supportedLanguage) => ({
				name: supportedLanguage.name.split('(')[0]!.trimEnd(),
				value: supportedLanguage.language,
			}),
		);

/** Allows the user to translate text from one language to another through the DeepL API. */
async function translate(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
		const input = <string | undefined> interaction.data?.options?.find((
			option,
		) => option.focused)?.value;
		if (!input) return;

		let choices: ApplicationCommandOptionChoice[];
		if (input.length === 0) {
			choices = supportedLanguagesChoices.slice(25);
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

	const sourceLanguageCode = <string | undefined> data.options?.at(0)?.value;
	const targetLanguageCode = <string | undefined> data.options?.at(1)?.value;
	const text = <string | undefined> data.options?.at(2)?.value;
	if (!(sourceLanguageCode && targetLanguageCode && text)) return;

	const show =
		<boolean> data.options?.find((option) => option.name === 'show')?.value ??
			false;

	const response = await sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.DeferredChannelMessageWithSource,
			data: { flags: !show ? ApplicationCommandFlags.Ephemeral : undefined },
		},
	);
	if (!response) return;

	const translationRequest = await fetch(
		addParametersToURL(deepLApiEndpoints.translate, {
			'auth_key': secrets.modules.language.deepL.secret,
			'text': text,
			'source_lang': sourceLanguageCode.split('-')[0]!,
			'target_lang': targetLanguageCode,
		}),
	);
	const translationJson = await translationRequest.json();
	const translation = <Translation> translationJson.translations[0];

	const source = supportedLanguages.find((supportedLanguage) =>
		supportedLanguage.language === sourceLanguageCode
	)!;
	const target = supportedLanguages.find((supportedLanguage) =>
		supportedLanguage.language === targetLanguageCode
	)!;

	return void editInteractionResponse(client.bot, interaction.token, {
		messageId: response.id,
		embeds: [{
			title: `${source.name} → ${target.name}`,
			color: configuration.interactions.responses.colors.blue,
			fields: [{
				name: source.name,
				value: text,
				inline: false,
			}, {
				name: target.name,
				value: translation.text.trim().length === 0 ? '⠀' : translation.text,
				inline: false,
			}],
		}],
	});
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
