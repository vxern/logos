import {
	ApplicationCommandChoice,
	ApplicationCommandOptionType,
	Client,
	Interaction,
	InteractionApplicationCommandData,
	InteractionResponseType,
} from '../../../../deps.ts';
import secrets from '../../../../secrets.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';
import { addParametersToURL } from '../../../utils.ts';

const command: Command = {
	name: 'translate',
	availability: Availability.MEMBERS,
	description:
		'Translates a text from the source language to the target language.',
	options: [{
		name: 'from',
		description: 'The source language.',
		required: true,
		autocomplete: true,
		type: ApplicationCommandOptionType.STRING,
	}, {
		name: 'to',
		description: 'The target language.',
		required: true,
		autocomplete: true,
		type: ApplicationCommandOptionType.STRING,
	}, {
		name: 'text',
		description: 'The text to translate.',
		required: true,
		type: ApplicationCommandOptionType.STRING,
	}, {
		name: 'show',
		description:
			'If set to true, the translation will be shown to other users.',
		type: ApplicationCommandOptionType.BOOLEAN,
	}],
	handle: translate,
};

/** Represents a response to a translation query. */
interface TranslationResponse {
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

const supportedLanguagesRequest: Response = await fetch(
	addParametersToURL('https://api-free.deepl.com/v2/languages', {
		'auth_key': secrets.modules.language.deepL.secret,
		'type': 'target',
	}),
);
const supportedLanguagesRaw: SupportedLanguage[] =
	(supportedLanguagesRequest.ok
		? await supportedLanguagesRequest.json()
		: []) as SupportedLanguage[];
const supportedLanguages: SupportedLanguage[] = supportedLanguagesRaw
	.filter((supportedLanguage, index, array) =>
		index ===
			array.findIndex((language) =>
				language.language.startsWith(supportedLanguage.language.split('-')[0]!)
			)
	);
const supportedLanguagesChoices: ApplicationCommandChoice[] = supportedLanguages
	.map(
		(supportedLanguage) => {
			return {
				name: supportedLanguage.name.split('(')[0]!.trimEnd(),
				value: supportedLanguage.language,
			};
		},
	);

/** Allows the user to translate text from one language to another through the DeepL API. */
async function translate(
	_: Client,
	interaction: Interaction,
): Promise<void> {
	if (interaction.isAutocomplete()) {
		const argument = interaction.data.options.find((option) => option.focused)!;
		const value = argument.value as string;
		const options = argument.value.length === 0
			? []
			: supportedLanguagesChoices.filter((language) => {
				return language.name.toLowerCase().startsWith(
					value.toLowerCase(),
				);
			});

		interaction.respond({
			type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
			choices: options,
		});
		return;
	}

	const data = interaction.data! as InteractionApplicationCommandData;
	const sourceCode = data.options[0]!.value! as string;
	const targetCode = data.options[1]!.value! as string;
	const text = data.options[2]!.value! as string;
	const show = data.options.find((option) => option.name === 'show')?.value ??
		false;

	const response = await interaction.defer(!show);

	const translationRequest = await fetch(
		addParametersToURL('https://api-free.deepl.com/v2/translate', {
			'auth_key': secrets.modules.language.deepL.secret,
			'text': text,
			'source_lang': sourceCode.split('-')[0]!,
			'target_lang': targetCode,
		}),
	);
	const translationJson = await translationRequest.json();
	const translation = translationJson.translations[0] as TranslationResponse;

	const source = supportedLanguages.find((supportedLanguage) =>
		supportedLanguage.language === sourceCode
	)!;
	const target = supportedLanguages.find((supportedLanguage) =>
		supportedLanguage.language === targetCode
	)!;

	response.editResponse({
		embeds: [{
			title: `${source.name} → ${target.name}`,
			color: configuration.interactions.responses.colors.blue,
			fields: [{
				name: source.name,
				value: text,
				inline: false,
			}, {
				name: target.name,
				value: translation.text,
				inline: false,
			}],
		}],
	});
}

export default command;
