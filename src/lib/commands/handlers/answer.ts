import { Client } from "logos/client";
import { AnswerComposer } from "logos/commands/components/modal-composers/answer-composer";

async function handleAnswer(client: Client, interaction: Logos.Interaction): Promise<void> {
	const member = client.entities.members.get(interaction.guildId)?.get(interaction.user.id);
	if (member === undefined) {
		return;
	}

	const message = interaction.data?.resolved?.messages?.array()?.at(0);
	if (message === undefined) {
		return;
	}

	if (message.author.toggles?.has("bot") || message.content.trim().length === 0) {
		const strings = constants.contexts.cannotAnswer({
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
		const strings = constants.contexts.cannotAnswerOwn({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	const composer = new AnswerComposer(client, { interaction, question: message.content });

	composer.onSubmit(async (submission, { formData }) => {
		await client.acknowledge(submission);

		const strings = constants.contexts.answer({
			localise: client.localise.bind(client),
			locale: submission.locale,
		});

		await client.bot.helpers
			.sendMessage(message.channelId, {
				messageReference: {
					messageId: message.id,
					channelId: message.channelId,
					guildId: interaction.guildId,
					failIfNotExists: false,
				},
				embeds: [
					{
						description: `– *${formData.answer}*`,
						color: constants.colours.success,
						footer: {
							text: `${constants.emojis.answer} ${strings.submittedBy({
								username: client.diagnostics.user(interaction.user),
							})}`,
							iconUrl: Discord.avatarUrl(interaction.user.id, interaction.user.discriminator, {
								avatar: interaction.user.avatar,
							}),
						},
					},
				],
			})
			.catch(() => client.log.warn(`Failed to send answer to ${client.diagnostics.channel(message.channelId)}.`));
	});

	await composer.open();
}

export { handleAnswer };
