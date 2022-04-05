import {
	Interaction,
	InteractionApplicationCommandData,
	InteractionResponseType,
} from '../../../../deps.ts';
import secrets from '../../../../secrets.ts';
import { Availability } from '../../../commands/availability.ts';
import { Command } from '../../../commands/command.ts';
import { OptionType } from '../../../commands/option.ts';
import configuration from '../../../configuration.ts';
import { addParametersToURL } from '../../../utils.ts';

interface SupportedLanguage {
	language: string;
	name: string;
	// deno-lint-ignore camelcase
	supports_formality: boolean;
}

const supportedLanguagesRequest = await fetch(
	addParametersToURL('https://api-free.deepl.com/v2/languages', {
		'auth_key': secrets.modules.language.deepL.secret,
		'type': 'target',
	}),
);
const supportedLanguagesJson = await supportedLanguagesRequest.json();
const supportedLanguages = (supportedLanguagesJson as SupportedLanguage[])
	.filter((supportedLanguage, index, array) =>
		index ===
			array.findIndex((language) =>
				language.language.startsWith(supportedLanguage.language.split('-')[0]!)
			)
	);
const supportedLanguagesChoices = supportedLanguages.map(
	(supportedLanguage) => {
		return {
			name: supportedLanguage.name.split('(')[0]!,
			value: supportedLanguage.language,
		};
	},
);

const command: Command = {
	name: 'translate',
	availability: Availability.MEMBERS,
	description:
		'Translates a given text from the server language to English or vice-versa.',
	options: [{
		name: 'from',
		description: 'The source language.',
		required: true,
		choices: supportedLanguagesChoices,
		type: OptionType.STRING,
	}, {
		name: 'to',
		description: 'The target language.',
		required: true,
		choices: supportedLanguagesChoices,
		type: OptionType.STRING,
	}, {
		name: 'text',
		description: 'The text to translate.',
		required: true,
		type: OptionType.STRING,
	}, {
		name: 'show',
		description:
			'If set to true, the translation will be shown to other users.',
		type: OptionType.BOOLEAN,
	}],
	handle: translate,
};

interface TranslationResponse {
	// deno-lint-ignore camelcase
	detected_source_language: string;
	text: string;
}

async function translate(interaction: Interaction): Promise<void> {
	const data = interaction.data! as InteractionApplicationCommandData;
	const sourceCode = data.options[0]!.value! as string;
	const targetCode = data.options[1]!.value! as string;
	const text = data.options[2]!.value! as string;
	const show = data.options.find((option) => option.name === 'show')?.value ??
		false;

	const response = await interaction.respond({
		type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE,
		ephemeral: !show,
	});

	const translationRequest = await fetch(
		addParametersToURL('https://api-free.deepl.com/v2/translate', {
			'auth_key': secrets.modules.language.deepL.secret,
			'text': text,
			'source_lang': sourceCode,
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
			title: `${source} → ${target}`,
			color: configuration.responses.colors.blue,
			fields: [{
				name: source.language,
				value: text,
				inline: false,
			}, {
				name: target.language,
				value: translation.text,
				inline: false,
			}],
		}],
	});
}

export default command;
