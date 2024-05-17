import { Client } from "logos/client";
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
		const strings = constants.contexts.cannotCorrect({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	if (message.author.id === interaction.user.id) {
		const strings = constants.contexts.cannotCorrectOwn({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	const correctedMember = client.entities.members.get(interaction.guildId)?.get(message.author.id);
	if (correctedMember === undefined) {
		return;
	}

	const doNotCorrectMeRoleId = (
		constants.roles.learning.collection.list.doNotCorrectMe.snowflakes as Record<string, string>
	)[interaction.guildId.toString()];
	if (doNotCorrectMeRoleId !== undefined) {
		if (correctedMember.roles.some((roleId) => roleId.toString() === doNotCorrectMeRoleId)) {
			const strings = constants.contexts.userDoesNotWantCorrections({
				localise: client.localise.bind(client),
				locale: interaction.locale,
			});

			await client.warning(interaction, {
				title: strings.title,
				description: strings.description,
			});

			return;
		}
	}

	if (message.content.length > constants.MAXIMUM_CORRECTION_MESSAGE_LENGTH) {
		const strings = constants.contexts.correctionTooLong({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});

		await client.warning(interaction, {
			title: strings.title,
			description: `${strings.description.tooLong} ${strings.description.maximumLength({
				character_limit: constants.MAXIMUM_CORRECTION_MESSAGE_LENGTH,
			})}`,
		});

		return;
	}

	const composer = new CorrectionComposer(client, {
		interaction,
		text: message.content,
		prefillCorrectedField: mode === "full",
	});

	composer.onSubmit(async (submission, { formData }) => {
		await client.acknowledge(submission);

		const strings = constants.contexts.correction({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});

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
						description: formData.corrected,
						color: constants.colours.success,
						footer: {
							text: `${constants.emojis.correction} ${strings.suggestedBy({
								username: client.diagnostics.user(interaction.user),
							})}`,
							iconUrl: Discord.avatarUrl(interaction.user.id, interaction.user.discriminator, {
								avatar: interaction.user.avatar,
							}),
						},
					},
				],
			})
			.catch(() =>
				client.log.warn(`Failed to send correction to ${client.diagnostics.channel(message.channelId)}.`),
			);
	});

	await composer.open();
}

export { handleMakeFullCorrection, handleMakePartialCorrection };
