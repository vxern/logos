import languages, {
	Languages,
	TranslationLanguage,
	getTranslationLanguage,
	isTranslationLanguage,
} from "logos:constants/languages";
import { trim } from "logos:core/formatting";
import { TranslationResult } from "logos/adapters/translators/adapter";
import { Client } from "logos/client";

async function handleTranslateChatInputAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { to: string; from: string }>,
): Promise<void> {
	const guild = client.entities.guilds.get(interaction.guildId);
	if (guild === undefined) {
		return;
	}

	if (
		interaction.parameters.focused === undefined ||
		interaction.parameters[interaction.parameters.focused] === undefined
	) {
		return;
	}

	const languageQueryTrimmed = interaction.parameters[interaction.parameters.focused].trim();
	if (languageQueryTrimmed.length === 0) {
		const strings = constants.contexts.autocompleteLanguage({ localise: client.localise, locale: interaction.locale });
		await client.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]);
		return;
	}

	const languageQueryLowercase = languageQueryTrimmed.toLowerCase();
	const choices = languages.languages.translation
		.map((language) => {
			const languageStringKey = constants.localisations.languages[language];

			if (languageStringKey === undefined) {
				return {
					name: language,
					value: language,
				};
			}

			const strings = {
				language: client.localise(languageStringKey, interaction.locale)(),
			};

			return {
				name: strings.language,
				value: language,
			};
		})
		.filter((choice) => choice.name?.toLowerCase().includes(languageQueryLowercase))
		.slice(0, 25)
		.sort((previous, next) => previous.name.localeCompare(next.name));

	await client.respond(interaction, choices);
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

	const hasEmbeds = message.embeds !== undefined && message.embeds.length !== 0;
	if (hasEmbeds) {
		const strings = constants.contexts.cannotUseMessageForTranslation({
			localise: client.localise,
			locale: interaction.locale,
		});
		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});
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
		const strings = constants.contexts.textEmpty({ localise: client.localise, locale: interaction.locale });
		await client.error(interaction, {
			title: strings.title,
			description: strings.description,
		});

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
			await client.error(interaction, {
				title: strings.title,
				description: strings.description,
			});
			return;
		}

		if (isSourceInvalid) {
			const strings = constants.contexts.sourceLanguageInvalid({
				localise: client.localise,
				locale: interaction.locale,
			});

			await client.error(interaction, {
				title: strings.title,
				description: strings.description,
			});

			return;
		}

		if (isTargetInvalid) {
			const strings = constants.contexts.targetLanguageInvalid({
				localise: client.localise,
				locale: interaction.locale,
			});

			await client.error(interaction, {
				title: strings.title,
				description: strings.description,
			});

			return;
		}

		if (from !== undefined && to !== undefined) {
			if (from === to) {
				const strings = constants.contexts.languagesNotDifferent({
					localise: client.localise,
					locale: interaction.locale,
				});

				await client.pushback(interaction, {
					title: strings.title,
					description: strings.description,
				});

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

	if (to !== undefined) {
		if (to !== sourceLanguage) {
			await translateText(client, interaction, { text, languages: { source: sourceLanguage, target: to } });
			return;
		}
	}

	const learningTranslationLanguage = getTranslationLanguage(interaction.learningLanguage);
	if (learningTranslationLanguage !== undefined) {
		if (learningTranslationLanguage !== sourceLanguage) {
			await translateText(client, interaction, {
				text,
				languages: { source: sourceLanguage, target: learningTranslationLanguage },
			});

			return;
		}
	}

	const translationLanguage = getTranslationLanguage(language);
	if (translationLanguage === undefined) {
		const strings = constants.contexts.cannotDetermineTargetLanguage({
			localise: client.localise,
			locale: interaction.locale,
		});

		await client.warning(interaction, {
			title: strings.title,
			description: `${strings.description.cannotDetermine}\n\n${strings.description.tryAgain}`,
		});

		return;
	}

	if (translationLanguage === sourceLanguage) {
		const strings = constants.contexts.cannotDetermineSourceLanguage({
			localise: client.localise,
			locale: interaction.locale,
		});

		await client.warning(interaction, {
			title: strings.title,
			description: `${strings.description.cannotDetermine}\n\n${strings.description.tryAgain}`,
		});

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
	const locale = interaction.parameters.show ? interaction.guildLocale : interaction.locale;

	const adapters = client.adapters.translators.getTranslators({ languages });
	if (adapters === undefined || adapters.length === 0) {
		const strings = constants.contexts.noTranslationAdapters({ localise: client.localise, locale: interaction.locale });
		await client.unsupported(interaction, {
			title: strings.title,
			description: strings.description,
		});

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
		await client.failed(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	// Ensures that an empty translation string does not result in embed failure.
	const translatedText = translation.text.trim().length !== 0 ? translation.text : constants.special.meta.whitespace;

	const isLong = text.length > 896; // 7/8 of 1024. Leaves room for text overhead.

	const strings = {
		...constants.contexts.translation({ localise: client.localise, locale: interaction.locale }),
		languages: {
			source: client.localise(constants.localisations.languages[languages.source], locale)(),
			target: client.localise(constants.localisations.languages[languages.target], locale)(),
		},
	};
	let embeds: Discord.CamelizedDiscordEmbed[];
	if (isLong) {
		embeds = [
			{
				title: strings.sourceText,
				description: text,
			},
			{
				title: strings.translation,
				description: translatedText,
				footer: {
					text: `${strings.languages.source} ${constants.emojis.indicators.arrowRight} ${strings.languages.target}`,
				},
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
				footer: {
					text: `${strings.languages.source} ${constants.emojis.indicators.arrowRight} ${strings.languages.target}`,
				},
			},
		];
	}

	const components: Discord.ActionRow[] | undefined = interaction.parameters.show
		? undefined
		: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [client.interactionRepetitionService.getShowButton(interaction)],
				},
		  ];

	await client.noticed(interaction, { embeds, components });
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
		await client.warning(interaction, {
			title: strings.title,
			description: `${strings.description.cannotDetermine}\n\n${strings.description.tryAgain}`,
		});

		return undefined;
	}

	if (!isTranslationLanguage(detectedLanguage)) {
		const strings = constants.contexts.languageNotSupported({ localise: client.localise, locale: interaction.locale });
		await client.unsupported(interaction, {
			title: strings.title,
			description: strings.description({
				language: client.localise(constants.localisations.languages[detectedLanguage], interaction.locale)(),
			}),
		});

		return undefined;
	}

	return detectedLanguage;
}

export { handleTranslateChatInput, handleTranslateChatInputAutocomplete, handleTranslateMessage };
