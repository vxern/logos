import { type Languages, getTranslationLanguage } from "logos:constants/languages";
import { type TranslationLanguage, isTranslationLanguage } from "logos:constants/languages/translation";
import type { TranslationResult } from "logos/adapters/translators/adapter";
import type { Client } from "logos/client";
import { TranslationSourceNotice } from "logos/commands/components/source-notices/translation-source-notice";
import { handleAutocompleteLanguage } from "logos/commands/fragments/autocomplete/language";

async function handleTranslateChatInputAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { to: string; from: string }>,
): Promise<void> {
	await handleAutocompleteLanguage(
		client,
		interaction,
		{ type: "translation" },
		{ parameter: interaction.parameters[interaction.parameters.focused ?? "from"] },
	);
}

async function handleTranslateChatInput(
	client: Client,
	interaction: Logos.Interaction<any, { text: string; from: string | undefined; to: string | undefined }>,
): Promise<void> {
	await handleTranslate(client, interaction, interaction.parameters);
}

async function handleTranslateMessage(client: Client, interaction: Logos.Interaction): Promise<void> {
	const message = interaction.data?.resolved?.messages?.array()?.at(0);
	if (message === undefined) {
		return;
	}

	const hasEmbeds = message.embeds !== undefined && message.embeds.length > 0;
	if (hasEmbeds) {
		const strings = constants.contexts.cannotUseMessageForTranslation({
			localise: client.localise,
			locale: interaction.locale,
		});
		client.warning(interaction, { title: strings.title, description: strings.description }).ignore();

		return;
	}

	await handleTranslate(client, interaction, { text: message.content });
}

async function handleTranslate(
	client: Client,
	interaction: Logos.Interaction,
	{ text, from, to }: { text: string; from?: string; to?: string },
): Promise<void> {
	const language = interaction.parameters.show ? interaction.guildLanguage : interaction.language;

	const isTextEmpty = text.trim().length === 0;
	if (isTextEmpty) {
		const strings = constants.contexts.textEmpty({
			localise: client.localise,
			locale: interaction.locale,
		});
		client.error(interaction, { title: strings.title, description: strings.description }).ignore();

		return;
	}

	let sourceLanguage: TranslationLanguage;

	if (from !== undefined || to !== undefined) {
		const isSourceInvalid = from !== undefined && !isTranslationLanguage(from);
		const isTargetInvalid = to !== undefined && !isTranslationLanguage(to);

		if (isSourceInvalid && isTargetInvalid) {
			const strings = constants.contexts.bothLanguagesInvalid({
				localise: client.localise,
				locale: interaction.locale,
			});
			client.error(interaction, { title: strings.title, description: strings.description }).ignore();

			return;
		}

		if (isSourceInvalid) {
			const strings = constants.contexts.sourceLanguageInvalid({
				localise: client.localise,
				locale: interaction.locale,
			});
			client.error(interaction, { title: strings.title, description: strings.description }).ignore();

			return;
		}

		if (isTargetInvalid) {
			const strings = constants.contexts.targetLanguageInvalid({
				localise: client.localise,
				locale: interaction.locale,
			});
			client.error(interaction, { title: strings.title, description: strings.description }).ignore();

			return;
		}

		if (from !== undefined && to !== undefined) {
			if (from === to) {
				const strings = constants.contexts.languagesNotDifferent({
					localise: client.localise,
					locale: interaction.locale,
				});
				client.pushback(interaction, { title: strings.title, description: strings.description }).ignore();

				return;
			}

			await translateText(client, interaction, { text, languages: { source: from, target: to } });
			return;
		}

		if (from === undefined) {
			const detectedLanguage = await detectLanguage(client, interaction, { text });
			if (detectedLanguage === undefined) {
				return;
			}

			sourceLanguage = detectedLanguage;
		} else {
			sourceLanguage = from;
		}
	} else {
		const detectedLanguage = await detectLanguage(client, interaction, { text });
		if (detectedLanguage === undefined) {
			return;
		}

		sourceLanguage = detectedLanguage;
	}

	if (to !== undefined && to !== sourceLanguage) {
		await translateText(client, interaction, { text, languages: { source: sourceLanguage, target: to } });
		return;
	}

	const learningTranslationLanguage = getTranslationLanguage(interaction.learningLanguage);
	if (learningTranslationLanguage !== undefined && learningTranslationLanguage !== sourceLanguage) {
		await translateText(client, interaction, {
			text,
			languages: { source: sourceLanguage, target: learningTranslationLanguage },
		});

		return;
	}

	const translationLanguage = getTranslationLanguage(language);
	if (translationLanguage === undefined) {
		const strings = constants.contexts.cannotDetermineTargetLanguage({
			localise: client.localise,
			locale: interaction.locale,
		});
		client
			.warning(interaction, {
				title: strings.title,
				description: `${strings.description.cannotDetermine}\n\n${strings.description.tryAgain}`,
			})
			.ignore();

		return;
	}

	if (translationLanguage === sourceLanguage) {
		const strings = constants.contexts.cannotDetermineSourceLanguage({
			localise: client.localise,
			locale: interaction.locale,
		});
		client
			.warning(interaction, {
				title: strings.title,
				description: `${strings.description.cannotDetermine}\n\n${strings.description.tryAgain}`,
			})
			.ignore();

		return;
	}

	await translateText(client, interaction, {
		text,
		languages: { source: sourceLanguage, target: translationLanguage },
	});
}

async function translateText(
	client: Client,
	interaction: Logos.Interaction,
	{ text, languages }: { text: string; languages: Languages<TranslationLanguage> },
): Promise<void> {
	const adapters = client.adapters.translators.getTranslators({ languages });
	if (adapters === undefined || adapters.length === 0) {
		const strings = constants.contexts.noTranslationAdapters({
			localise: client.localise,
			locale: interaction.locale,
		});
		client.unsupported(interaction, { title: strings.title, description: strings.description }).ignore();

		return;
	}

	await client.postponeReply(interaction, { visible: interaction.parameters.show });

	let translation: TranslationResult | undefined;
	for await (const element of Promise.createRace(adapters, (adapter) => adapter.translate({ text, languages }))) {
		if (element.result === undefined) {
			continue;
		}

		translation = element.result;

		break;
	}

	if (translation === undefined) {
		const strings = constants.contexts.failedToTranslate({ localise: client.localise, locale: interaction.locale });
		client.failed(interaction, { title: strings.title, description: strings.description }).ignore();

		return;
	}

	// Ensures that an empty translation string does not result in embed failure.
	const translatedText =
		translation.text.trim().length > 0 ? translation.text : constants.special.meta.forcedWhitespace;

	const isLong = text.length > 896; // 7/8 of 1024. Leaves room for text overhead.

	const strings = {
		...constants.contexts.translation({ localise: client.localise, locale: interaction.locale }),
		...constants.contexts.language({ localise: client.localise, locale: interaction.locale }),
	};

	const sourceLanguageFlag = constants.emojis.flags[languages.source];
	const sourceLanguageName = strings.language(languages.source);
	const targetLanguageFlag = constants.emojis.flags[languages.target];
	const targetLanguageName = strings.language(languages.target);
	const footerText = `${sourceLanguageFlag} ${sourceLanguageName} ${
		constants.emojis.commands.translate.direction
	} ${targetLanguageFlag} ${targetLanguageName}`;

	let embeds: Discord.Camelize<Discord.DiscordEmbed>[];
	if (isLong) {
		embeds = [
			{
				title: strings.sourceText,
				description: text,
			},
			{
				title: strings.translation,
				description: translatedText,
				footer: { text: footerText },
			},
		];
	} else {
		embeds = [
			{
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
				footer: { text: footerText },
			},
		];
	}

	const sourceNotice = new TranslationSourceNotice(client, { interaction, source: translation.source });

	await sourceNotice.register();

	const components: Discord.ActionRow[] = [
		{
			type: Discord.MessageComponentTypes.ActionRow,
			components: [
				...(interaction.parameters.show
					? []
					: [client.services.global("interactionRepetition").getShowButton(interaction)]),
				sourceNotice.button,
			] as [Discord.ButtonComponent],
		},
	];

	client.noticed(interaction, { embeds, components }).ignore();
}

async function detectLanguage(
	client: Client,
	interaction: Logos.Interaction,
	{ text }: { text: string },
): Promise<TranslationLanguage | undefined> {
	const detectedLanguages = await client.adapters.detectors.detectLanguages({ text });
	const detectedLanguage = detectedLanguages.likely.at(0);
	if (detectedLanguage === undefined) {
		const strings = constants.contexts.cannotDetermineTargetLanguage({
			localise: client.localise,
			locale: interaction.locale,
		});
		client
			.warning(interaction, {
				title: strings.title,
				description: `${strings.description.cannotDetermine}\n\n${strings.description.tryAgain}`,
			})
			.ignore();

		return undefined;
	}

	const translationLanguage = getTranslationLanguage(detectedLanguage);
	if (translationLanguage === undefined) {
		const strings = {
			...constants.contexts.languageNotSupported({ localise: client.localise, locale: interaction.locale }),
			...constants.contexts.language({ localise: client.localise, locale: interaction.locale }),
		};
		client
			.unsupported(interaction, {
				title: strings.title,
				description: strings.description({ language: strings.language(detectedLanguage) }),
			})
			.ignore();

		return undefined;
	}

	return translationLanguage;
}

export { handleTranslateChatInput, handleTranslateChatInputAutocomplete, handleTranslateMessage };
