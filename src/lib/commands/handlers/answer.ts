import diagnostics from "logos:core/diagnostics";
import { Client } from "logos/client";
import { AnswerComposer } from "logos/commands/components/modal-composers/answer-composer";

async function handleAnswer(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const member = client.entities.members.get(guildId)?.get(interaction.user.id);
	if (member === undefined) {
		return;
	}

	const message = interaction.data?.resolved?.messages?.array()?.at(0);
	if (message === undefined) {
		return;
	}

	if (message.author.toggles?.has("bot") || message.content.trim().length === 0) {
		const strings = {
			title: client.localise("answer.strings.cannotAnswer.title", locale)(),
			description: client.localise("answer.strings.cannotAnswer.description", locale)(),
		};

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	if (message.author.id === interaction.user.id) {
		const strings = {
			title: client.localise("answer.strings.cannotAnswerOwn.title", locale)(),
			description: client.localise("answer.strings.cannotAnswerOwn.description", locale)(),
		};

		await client.warning(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	const composer = new AnswerComposer(client, { interaction, question: message.content });

	composer.onSubmit(async (submission, { locale }, { formData }) => {
		await client.acknowledge(submission);

		const strings = {
			answer: client.localise("answer.strings.answer", locale)(),
			submittedBy: client.localise(
				"answer.strings.submittedBy",
				locale,
			)({ username: diagnostics.display.user(interaction.user, { includeId: false }) }),
		};

		client.bot.rest
			.sendMessage(message.channelId, {
				messageReference: { messageId: message.id, channelId: message.channelId, guildId, failIfNotExists: false },
				embeds: [
					{
						description: `– *${formData.answer}*`,
						color: constants.colours.success,
						footer: {
							text: `${constants.emojis.answer} ${strings.submittedBy}`,
							iconUrl: Discord.avatarUrl(interaction.user.id, interaction.user.discriminator, {
								avatar: interaction.user.avatar,
							}),
						},
					},
				],
			})
			.catch(() => client.log.warn(`Failed to send answer to ${diagnostics.display.channel(message.channelId)}.`));
	});

	await composer.open();
}

export { handleAnswer };
