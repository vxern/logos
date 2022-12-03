import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	editOriginalInteractionResponse,
	Embed,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	sendInteractionResponse,
} from 'discordeno';
import {
	Commands,
	createLocalisations,
	getLocalisationsForLanguage,
	localise,
} from 'logos/assets/localisations/mod.ts';
import { resolveToSupportedLanguage } from 'logos/src/commands/language/module.ts';
import { CommandBuilder } from 'logos/src/commands/command.ts';
import { show } from 'logos/src/commands/parameters.ts';
import { Client } from 'logos/src/client.ts';
import { addParametersToURL, diagnosticMentionUser, parseArguments } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import { deepLApiEndpoints } from 'logos/constants.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.translate),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: handleTranslateText,
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

async function translateText(
	sourceLanguageCode: string,
	targetLanguageCode: string,
	text: string,
): Promise<Translation | undefined> {
	const sourceLanguageCodeBase = sourceLanguageCode.split('-').at(0)!;

	const response = await fetch(
		addParametersToURL(deepLApiEndpoints.translate, {
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

/** Allows the user to translate text from one language to another through the DeepL API. */
async function handleTranslateText(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const [{ from, to, text, show }, focused] = parseArguments(
		interaction.data?.options,
		{ show: 'boolean' },
	);

	if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
		if (focused === undefined || focused.value === undefined) return;

		const isInputtingSourceLanguage = focused.name === 'from';
		const localisations = isInputtingSourceLanguage
			? Commands.translate.strings.sourceLanguage
			: Commands.translate.strings.targetLanguage;

		const inputLowercase = (<string> focused.value).toLowerCase();
		const choices = client.metadata.supportedTranslationLanguages
			.map((language) => ({
				name: localise(localisations, interaction.locale)(language.name),
				value: language.code,
			}))
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
							Commands.translate.strings.targetLanguageMustBeDifferentFromSource,
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
						description: localise(Commands.translate.strings.textCannotBeEmpty, interaction.locale),
						color: configuration.interactions.responses.colors.yellow,
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
									? localise(Commands.translate.strings.invalid.both, interaction.locale)
									: localise(Commands.translate.strings.invalid.source, interaction.locale)
							)
							: localise(Commands.translate.strings.invalid.target, interaction.locale),
						color: configuration.interactions.responses.colors.red,
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

	client.log.info(
		`Translating a text of length ${text.length} from ${sourceLanguage.name} to ${targetLanguage.name} ` +
			`as requested by ${diagnosticMentionUser(interaction.user, true)} on ${guild.name}...`,
	);

	const translation = await translateText(sourceLanguage.code, targetLanguage.code, text);
	if (translation === undefined) {
		return void editOriginalInteractionResponse(
			bot,
			interaction.token,
			{
				embeds: [{
					description: localise(Commands.translate.strings.failed, interaction.locale),
					color: configuration.interactions.responses.colors.red,
				}],
			},
		);
	}

	// Ensures that an empty translation string does not result in embed failure.
	const translatedText = translation.text.trim().length !== 0 ? translation.text : '⠀';

	const sourceLanguageName = localise(getLocalisationsForLanguage(sourceLanguage.name), interaction.locale);
	const targetLanguageName = localise(getLocalisationsForLanguage(targetLanguage.name), interaction.locale);

	// TODO(vxern): This is a hard-coded, custom upper limit. The actual limit is 1024.
	//  As such, the check could be improved for precision reasons.
	const isLong = text.length > 950;

	let embeds: Embed[] = [];
	if (!isLong) {
		embeds = [{
			color: configuration.interactions.responses.colors.blue,
			fields: [{
				name: localise(Commands.translate.strings.sourceText, interaction.locale),
				value: text,
				inline: false,
			}, {
				name: localise(Commands.translate.strings.translation, interaction.locale),
				value: translatedText,
				inline: false,
			}],
			footer: { text: `${sourceLanguageName} ➜ ${targetLanguageName}` },
		}];
	} else {
		embeds = [{
			color: configuration.interactions.responses.colors.blue,
			title: localise(Commands.translate.strings.sourceText, interaction.locale),
			description: text,
		}, {
			color: configuration.interactions.responses.colors.blue,
			title: localise(Commands.translate.strings.translation, interaction.locale),
			description: translatedText,
			footer: { text: `${sourceLanguageName} ➜ ${targetLanguageName}` },
		}];
	}

	return void editOriginalInteractionResponse(
		bot,
		interaction.token,
		{ embeds },
	);
}

export default command;
