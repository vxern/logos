import { list } from "logos:constants/formatting";
import type { Client } from "logos/client";
import { RecognitionSourceNotice } from "logos/commands/components/source-notices/recognition-notice";

async function handleRecogniseLanguageChatInput(
	client: Client,
	interaction: Logos.Interaction<any, { text: string }>,
): Promise<void> {
	await handleRecogniseLanguage(client, interaction, { text: interaction.parameters.text, isMessage: false });
}

async function handleRecogniseLanguageMessage(client: Client, interaction: Logos.Interaction): Promise<void> {
	const message = interaction.data?.resolved?.messages?.array()?.at(0);
	if (message === undefined) {
		return;
	}

	const hasEmbeds = message.embeds !== undefined && message.embeds.length > 0;
	if (hasEmbeds) {
		const strings = constants.contexts.cannotUseForRecognition({
			localise: client.localise,
			locale: interaction.locale,
		});
		client.warning(interaction, { title: strings.title, description: strings.description }).ignore();

		return;
	}

	await handleRecogniseLanguage(client, interaction, { text: message.content, isMessage: true });
}

async function handleRecogniseLanguage(
	client: Client,
	interaction: Logos.Interaction,
	{ text, isMessage }: { text: string; isMessage: boolean },
): Promise<void> {
	const isTextEmpty = text.trim().length === 0;
	if (isTextEmpty) {
		const strings = constants.contexts.textEmpty({ localise: client.localise, locale: interaction.locale });
		client.warning(interaction, { title: strings.title, description: strings.description }).ignore();

		return;
	}

	client.postponeReply(interaction).ignore();

	const detectedLanguages = await client.adapters.detectors.detectLanguages({ text });
	if (detectedLanguages.likely.length === 0 && detectedLanguages.possible.length === 0) {
		const strings = constants.contexts.unknownLanguage({ localise: client.localise, locale: interaction.locale });
		client
			.unsupported(interaction, {
				title: strings.title,
				description: isMessage ? strings.description.message : strings.description.text,
			})
			.ignore();

		return;
	}

	const sourceNotice = new RecognitionSourceNotice(client, { interaction, sources: detectedLanguages.sources });

	await sourceNotice.register();

	if (detectedLanguages.likely.length === 1 && detectedLanguages.possible.length === 0) {
		const language = detectedLanguages.likely.at(0);
		if (language === undefined) {
			throw new Error("Detected language unexpectedly undefined.");
		}

		const strings = {
			...constants.contexts.likelyMatch({ localise: client.localise, locale: interaction.locale }),
			...constants.contexts.language({ localise: client.localise, locale: interaction.locale }),
		};
		client
			.noticed(interaction, {
				embeds: [
					{
						description: `> *${text}*\n\n${strings.description({ language: strings.language(language) })}`,
					},
				],
				components: [
					{
						type: Discord.MessageComponentTypes.ActionRow,
						components: [sourceNotice.button],
					},
				],
			})
			.ignore();

		return;
	}

	{
		const fields: Discord.CamelizedDiscordEmbedField[] = [];

		if (detectedLanguages.likely.length === 1) {
			const language = detectedLanguages.likely.at(0);
			if (language === undefined) {
				throw new Error("Likely detected language unexpectedly undefined.");
			}

			const strings = {
				...constants.contexts.likelyMatch({ localise: client.localise, locale: interaction.locale }),
				...constants.contexts.language({ localise: client.localise, locale: interaction.locale }),
			};
			fields.push({
				name: `${constants.emojis.detect.likely} ${strings.title}`,
				value: strings.description({ language: `**${strings.language(language)}` }),
				inline: false,
			});
		} else if (detectedLanguages.likely.length > 0) {
			const strings = {
				...constants.contexts.likelyMatches({ localise: client.localise, locale: interaction.locale }),
				...constants.contexts.language({ localise: client.localise, locale: interaction.locale }),
			};
			const languageNamesLocalised = detectedLanguages.likely.map((language) => strings.language(language));
			const languageNamesFormatted = list(languageNamesLocalised.map((languageName) => `***${languageName}***`));

			fields.push({
				name: `${constants.emojis.detect.likely} ${strings.title}`,
				value: `${strings.description}\n${languageNamesFormatted}`,
				inline: false,
			});
		}

		if (detectedLanguages.possible.length === 1) {
			const language = detectedLanguages.possible.at(0);
			if (language === undefined) {
				throw new Error("Possible detected language unexpectedly undefined.");
			}

			const strings = {
				...constants.contexts.possibleMatch({ localise: client.localise, locale: interaction.locale }),
				...constants.contexts.language({ localise: client.localise, locale: interaction.locale }),
			};
			fields.push({
				name: `${constants.emojis.detect.possible} ${strings.title}`,
				value: strings.description({ language: `**${strings.language(language)}**` }),
				inline: false,
			});
		} else if (detectedLanguages.possible.length > 0) {
			const strings = {
				...constants.contexts.possibleMatches({ localise: client.localise, locale: interaction.locale }),
				...constants.contexts.language({ localise: client.localise, locale: interaction.locale }),
			};
			const languageNamesLocalised = detectedLanguages.possible.map((language) => strings.language(language));
			const languageNamesFormatted = list(languageNamesLocalised.map((languageName) => `***${languageName}***`));

			fields.push({
				name: `${constants.emojis.detect.possible} ${strings.title}`,
				value: `${strings.description}\n${languageNamesFormatted}`,
				inline: false,
			});
		}

		client
			.noticed(interaction, {
				embeds: [
					{
						description: `> *${text}*\n\n`,
						fields,
					},
				],
				components: [
					{
						type: Discord.MessageComponentTypes.ActionRow,
						components: [sourceNotice.button],
					},
				],
			})
			.ignore();
	}
}

export { handleRecogniseLanguageChatInput, handleRecogniseLanguageMessage };
