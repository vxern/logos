import { Locale } from "../../../../constants/languages";
import { trim } from "../../../../formatting";
import { Client } from "../../../client";
import { InteractionCollector } from "../../../collectors";
import { Guild } from "../../../database/guild";
import { Resource } from "../../../database/resource";
import { Modal, createModalComposer } from "../../../interactions";

type ResourceError = "failure";

async function handleSubmitResource(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const configuration = guildDocument.resourceSubmissions;
	if (configuration === undefined) {
		return;
	}

	const guild = client.entities.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const member = interaction.member;
	if (member === undefined) {
		return;
	}

	const crossesRateLimit = Guild.crossesRateLimit(
		await Resource.getAll(client, { where: { authorId: interaction.user.id.toString() } }),
		configuration.rateLimit ?? defaults.RESOURCE_RATE_LIMIT,
	);
	if (!crossesRateLimit) {
		const strings = {
			title: client.localise("resource.strings.tooMany.title", locale)(),
			description: client.localise("resource.strings.tooMany.description", locale)(),
		};

		client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colours.dullYellow,
				},
			],
		});
		return;
	}

	const resourceService = client.getPromptService(guild.id, { type: "resources" });
	if (resourceService === undefined) {
		return;
	}

	createModalComposer<Resource["answers"]>(client, interaction, {
		modal: generateResourceModal(client, { locale }),
		onSubmit: async (submission, answers) => {
			await client.postponeReply(submission);

			const resourceDocument = await Resource.create(client, {
				guildId: guild.id.toString(),
				authorId: interaction.user.id.toString(),
				answers,
			});

			client.tryLog("resourceSend", {
				guildId: guild.id,
				journalling: configuration.journaling,
				args: [member, resourceDocument],
			});

			const user = client.entities.users.get(interaction.user.id);
			if (user === undefined) {
				return "failure";
			}

			const prompt = await resourceService.savePrompt(user, resourceDocument);
			if (prompt === undefined) {
				return "failure";
			}

			resourceService.registerDocument(resourceDocument);
			resourceService.registerPrompt(prompt, interaction.user.id, resourceDocument);
			resourceService.registerHandler(resourceDocument);

			const strings = {
				title: client.localise("resource.strings.sent.title", locale)(),
				description: client.localise("resource.strings.sent.description", locale)(),
			};

			client.editReply(submission, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colours.lightGreen,
					},
				],
			});

			return true;
		},
		onInvalid: async (submission, error) =>
			handleSubmittedInvalidResource(client, submission, error as ResourceError | undefined, { locale }),
	});
}

async function handleSubmittedInvalidResource(
	client: Client,
	submission: Logos.Interaction,
	error: ResourceError | undefined,
	{ locale }: { locale: Locale },
): Promise<Logos.Interaction | undefined> {
	const { promise, resolve } = Promise.withResolvers<Logos.Interaction | undefined>();

	const continueButton = new InteractionCollector(client, { only: [submission.user.id], isSingle: true });
	const cancelButton = new InteractionCollector(client, { only: [submission.user.id] });
	const returnButton = new InteractionCollector(client, {
		only: [submission.user.id],
		isSingle: true,
		dependsOn: cancelButton,
	});
	const leaveButton = new InteractionCollector(client, {
		only: [submission.user.id],
		isSingle: true,
		dependsOn: cancelButton,
	});

	continueButton.onCollect(async (buttonPress) => {
		client.deleteReply(submission);
		resolve(buttonPress);
	});

	cancelButton.onCollect(async (cancelButtonPress) => {
		returnButton.onCollect(async (returnButtonPress) => {
			client.deleteReply(submission);
			client.deleteReply(cancelButtonPress);
			resolve(returnButtonPress);
		});

		leaveButton.onCollect(async (_) => {
			client.deleteReply(submission);
			client.deleteReply(cancelButtonPress);
			resolve(undefined);
		});

		const strings = {
			title: client.localise("resource.strings.sureToCancel.title", locale)(),
			description: client.localise("resource.strings.sureToCancel.description", locale)(),
			stay: client.localise("prompts.stay", locale)(),
			leave: client.localise("prompts.leave", locale)(),
		};

		client.reply(cancelButtonPress, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colours.dullYellow,
				},
			],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							type: Discord.MessageComponentTypes.Button,
							customId: returnButton.customId,
							label: strings.stay,
							style: Discord.ButtonStyles.Success,
						},
						{
							type: Discord.MessageComponentTypes.Button,
							customId: leaveButton.customId,
							label: strings.leave,
							style: Discord.ButtonStyles.Danger,
						},
					],
				},
			],
		});
	});

	client.registerInteractionCollector(continueButton);
	client.registerInteractionCollector(cancelButton);
	client.registerInteractionCollector(returnButton);
	client.registerInteractionCollector(leaveButton);

	let embed!: Discord.CamelizedDiscordEmbed;
	switch (error) {
		default: {
			const strings = {
				title: client.localise("resource.strings.failed", locale)(),
				description: client.localise("resource.strings.failed", locale)(),
			};

			client.editReply(submission, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colours.dullYellow,
					},
				],
			});

			break;
		}
	}

	const strings = {
		continue: client.localise("prompts.continue", locale)(),
		cancel: client.localise("prompts.cancel", locale)(),
	};

	client.editReply(submission, {
		embeds: [embed],
		components: [
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						type: Discord.MessageComponentTypes.Button,
						customId: continueButton.customId,
						label: strings.continue,
						style: Discord.ButtonStyles.Success,
					},
					{
						type: Discord.MessageComponentTypes.Button,
						customId: cancelButton.customId,
						label: strings.cancel,
						style: Discord.ButtonStyles.Danger,
					},
				],
			},
		],
	});

	return promise;
}

function generateResourceModal(client: Client, { locale }: { locale: Locale }): Modal<Resource["answers"]> {
	const strings = {
		title: client.localise("resource.title", locale)(),
		resource: client.localise("resource.fields.resource", locale)(),
	};

	return {
		title: strings.title,
		fields: [
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						customId: "resource",
						type: Discord.MessageComponentTypes.InputText,
						label: trim(strings.resource, 45),
						style: Discord.TextStyles.Paragraph,
						required: true,
						minLength: 16,
						maxLength: 256,
					},
				],
			},
		],
	};
}

export { handleSubmitResource };
