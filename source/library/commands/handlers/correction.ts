import { diffWordsWithSpace } from "diff";
import type { Client } from "logos/client";
import { CorrectionComposer } from "logos/commands/components/modal-composers/correction-composer";

type CorrectionMode = "partial" | "full";

async function handleMakePartialCorrection(client: Client, interaction: Logos.Interaction): Promise<void> {
	await handleMakeCorrection(client, interaction, { mode: "partial" });
}

async function handleMakeFullCorrection(client: Client, interaction: Logos.Interaction): Promise<void> {
	await handleMakeCorrection(client, interaction, { mode: "full" });
}

async function handleMakeCorrection(
	client: Client,
	interaction: Logos.Interaction,
	{ mode }: { mode: CorrectionMode },
): Promise<void> {
	const member = client.entities.members.get(interaction.guildId)?.get(interaction.user.id);
	if (member === undefined) {
		return;
	}

	const message = interaction.data?.resolved?.messages?.array()?.at(0);
	if (message === undefined) {
		return;
	}

	if (message.author.toggles?.has("bot") || message.content.trim().length === 0) {
		const strings = constants.contexts.cannotCorrect({ localise: client.localise, locale: interaction.locale });
		client.warning(interaction, { title: strings.title, description: strings.description }).ignore();

		return;
	}

	if (message.author.id === interaction.user.id) {
		const strings = constants.contexts.cannotCorrectOwn({ localise: client.localise, locale: interaction.locale });
		client.warning(interaction, { title: strings.title, description: strings.description }).ignore();

		return;
	}

	const correctedMember = client.entities.members.get(interaction.guildId)?.get(message.author.id);
	if (correctedMember === undefined) {
		return;
	}

	const doNotCorrectMeRoleId = (
		constants.roles.learning.collection.list.doNotCorrectMe.snowflakes as Record<string, string>
	)[interaction.guildId.toString()];
	if (
		doNotCorrectMeRoleId !== undefined &&
		correctedMember.roles.some((roleId) => roleId.toString() === doNotCorrectMeRoleId)
	) {
		const strings = constants.contexts.userDoesNotWantCorrections({
			localise: client.localise,
			locale: interaction.locale,
		});
		client.warning(interaction, { title: strings.title, description: strings.description }).ignore();

		return;
	}

	if (message.content.length > constants.MAXIMUM_CORRECTION_MESSAGE_LENGTH) {
		const strings = constants.contexts.correctionTooLong({
			localise: client.localise,
			locale: interaction.locale,
		});
		client
			.warning(interaction, {
				title: strings.title,
				description: `${strings.description.tooLong} ${strings.description.maximumLength({
					character_limit: constants.MAXIMUM_CORRECTION_MESSAGE_LENGTH,
				})}`,
			})
			.ignore();

		return;
	}

	const composer = new CorrectionComposer(client, {
		interaction,
		text: message.content,
		prefillCorrectedField: mode === "full",
	});

	composer.onSubmit(async (submission, { formData }) => {
		client.acknowledge(submission).ignore();

		const differences = diffWordsWithSpace(formData.original, formData.corrected, {
			intlSegmenter: new Intl.Segmenter(interaction.learningLocale, { granularity: "word" }),
		});
		const content = differences.reduce((content, part) => {
			if (part.added) {
				return `${content}__${part.value}__`;
			}

			if (part.removed) {
				return content;
			}

			return `${content}${part.value}`;
		}, "");

		const strings = constants.contexts.correction({ localise: client.localise, locale: interaction.locale });
		client.bot.helpers
			.sendMessage(message.channelId, {
				messageReference: {
					messageId: message.id,
					channelId: message.channelId,
					guildId: interaction.guildId,
					failIfNotExists: false,
				},
				embeds: [
					{
						description: content,
						color: constants.colours.success,
						footer: {
							text: `${constants.emojis.commands.correction} ${strings.suggestedBy({
								username: client.diagnostics.user(interaction.user),
							})}`,
							iconUrl: Discord.avatarUrl(interaction.user.id, interaction.user.discriminator, {
								avatar: interaction.user.avatar,
							}),
						},
					},
				],
			})
			.catch((error) =>
				client.log.warn(
					error,
					`Failed to send correction to ${client.diagnostics.channel(message.channelId)}.`,
				),
			)
			.ignore();
	});

	await composer.open();
}

export { handleMakeFullCorrection, handleMakePartialCorrection };
