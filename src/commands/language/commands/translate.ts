import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	editOriginalInteractionResponse,
	Embed,
	Interaction,
	InteractionResponseTypes,
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
import { parseArguments } from 'logos/src/interactions.ts';
import { addParametersToURL, diagnosticMentionUser } from 'logos/src/utils.ts';
import constants from 'logos/constants.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.translate),
	isRateLimited: true,
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: handleTranslateText,
	handleAutocomplete: handleTranslateTextAutocomplete,
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

async function handleTranslateTextAutocomplete([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [_, focused] = parseArguments(interaction.data?.options, { show: 'boolean' });

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	if (focused === undefined || focused.value === undefined) return;

	const isInputtingSourceLanguage = focused.name === 'from';
	const localisations = isInputtingSourceLanguage
		? Commands.translate.strings.sourceLanguage
		: Commands.translate.strings.targetLanguage;

	const inputLowercase = (focused.value as string).toLowerCase();

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
							Commands.translate.strings.targetLanguageMustBeDifferentFromSource,
							interaction.locale,
						),
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
						description: localise(Commands.translate.strings.textCannotBeEmpty, interaction.locale),
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
									? localise(Commands.translate.strings.invalid.both, interaction.locale)
									: localise(Commands.translate.strings.invalid.source, interaction.locale)
							)
							: localise(Commands.translate.strings.invalid.target, interaction.locale),
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

	const translation = await translate(sourceLanguage.code, targetLanguage.code, text);
	if (translation === undefined) {
		return void editOriginalInteractionResponse(
			bot,
			interaction.token,
			{
				embeds: [{
					description: localise(Commands.translate.strings.failed, interaction.locale),
					color: constants.colors.red,
				}],
			},
		);
	}

	// Ensures that an empty translation string does not result in embed failure.
	const translatedText = translation.text.trim().length !== 0 ? translation.text : constants.symbols.meta.whitespace;

	const sourceLanguageName = localise(getLocalisationsForLanguage(sourceLanguage.name), interaction.locale);
	const targetLanguageName = localise(getLocalisationsForLanguage(targetLanguage.name), interaction.locale);

	const isLong = text.length > 896; // 7/8 of 1024. Leaves room for text overhead.

	let embeds: Embed[] = [];
	if (!isLong) {
		embeds = [{
			color: constants.colors.blue,
			fields: [{
				name: localise(Commands.translate.strings.sourceText, interaction.locale),
				value: text,
				inline: false,
			}, {
				name: localise(Commands.translate.strings.translation, interaction.locale),
				value: translatedText,
				inline: false,
			}],
			footer: { text: `${sourceLanguageName} ${constants.symbols.indicators.arrowRight} ${targetLanguageName}` },
		}];
	} else {
		embeds = [{
			color: constants.colors.blue,
			title: localise(Commands.translate.strings.sourceText, interaction.locale),
			description: text,
		}, {
			color: constants.colors.blue,
			title: localise(Commands.translate.strings.translation, interaction.locale),
			description: translatedText,
			footer: { text: `${sourceLanguageName} ${constants.symbols.indicators.arrowRight} ${targetLanguageName}` },
		}];
	}

	return void editOriginalInteractionResponse(
		bot,
		interaction.token,
		{ embeds },
	);
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
