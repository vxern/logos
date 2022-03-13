import { franc } from 'https://cdn.skypack.dev/franc@6.0.0';
import {
	Interaction,
	InteractionApplicationCommandData,
	InteractionResponseType,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/availability.ts';
import { Command } from '../../../commands/command.ts';
import { OptionType } from '../../../commands/option.ts';
import configuration from '../../../configuration.ts';
import { capitalise } from '../../../formatting.ts';
import {
	addParametersToURL,
	getLanguage,
	getLanguageCode,
} from '../../../utils.ts';

const command: Command = {
	name: 'translate',
	availability: Availability.MEMBERS,
	description:
		'Translates a given text from the server language to English or vice-versa.',
	options: [{
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

interface LanguageResponse {
	language: string;
	name: string;
	supports_formality: boolean;
}

interface TranslationResponse {
	detected_source_language: string;
	text: string;
}

async function translate(interaction: Interaction): Promise<void> {
	const data = interaction.data! as InteractionApplicationCommandData;
	const text = data.options[0].value! as string;
	const show = data.options.find((option) => option.name === 'show')?.value ??
		false;

	const response = await interaction.respond({
		type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE,
		ephemeral: !show,
	});

	const language = Client.getLanguage(interaction.guild!);

	const supportedLanguagesRequest = await fetch(
		addParametersToURL('https://api-free.deepl.com/v2/languages', {
			'auth_key': Deno.env.get(
				'DEEPL_SECRET',
			)!,
			'type': 'target',
		}),
	);
	const supportedLanguagesJson = await supportedLanguagesRequest.json();
	const supportedLanguages: string[] = supportedLanguagesJson.map((
		language: LanguageResponse,
	) => language.name.split(' ')[0]);

	if (!supportedLanguages.includes(capitalise(language))) {
		response.editResponse({
			embeds: [{
				title: 'Unsupported language.',
				description:
					`The ${language} language does not have support for translation yet.`,
				color: configuration.responses.colors.red,
			}],
		});
		return;
	}

	const languageCode = getLanguageCode(language);
	const targetCode = franc(text) === 'eng' ? languageCode : 'en';

	const translationRequest = await fetch(
		addParametersToURL('https://api-free.deepl.com/v2/translate', {
			'auth_key': Deno.env.get('DEEPL_SECRET')!,
			'text': text,
			'target_lang': targetCode.toUpperCase(),
		}),
	);
	const translationJson = await translationRequest.json();
	const translation = translationJson.translations[0] as TranslationResponse;
  const sourceCode = translation.detected_source_language.toLowerCase();

  const source = getLanguage(sourceCode);
  const target = getLanguage(targetCode);

	response.editResponse({
		embeds: [{
			title: `${source} → ${target}`,
			color: configuration.responses.colors.blue,
      fields: [{
			  name: source,
			  value: text,
        inline: false,
      }, {
			  name: target,
			  value: translation.text,
        inline: false,
      }]
		}],
	});
}

export default command;
