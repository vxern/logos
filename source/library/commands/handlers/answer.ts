import type { Client } from "logos/client";
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
		const strings = constants.contexts.cannotAnswer({ localise: client.localise, locale: interaction.locale });
		client.warning(interaction, { title: strings.title, description: strings.description }).ignore();

		return;
	}

	if (message.author.id === interaction.user.id) {
		const strings = constants.contexts.cannotAnswerOwn({ localise: client.localise, locale: interaction.locale });
		client.warning(interaction, { title: strings.title, description: strings.description }).ignore();

		return;
	}

	const composer = new AnswerComposer(client, { interaction, question: message.content });

	composer.onSubmit(async (submission, { formData }) => {
		client.acknowledge(submission).ignore();

		const strings = constants.contexts.answer({ localise: client.localise, locale: submission.locale });

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
						description: `– *${formData.answer}*`,
						color: constants.colours.success,
						footer: {
							text: `${constants.emojis.commands.answer} ${strings.submittedBy({
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
				client.log.warn(error, `Failed to send answer to ${client.diagnostics.channel(message.channelId)}.`),
			)
			.ignore();
	});

	await composer.open();
}

export { handleAnswer };
