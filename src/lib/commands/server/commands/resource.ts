import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import defaults from "../../../../defaults";
import { trim } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, InteractionCollector } from "../../../client";
import { timeStructToMilliseconds } from "../../../database/guild";
import { Guild } from "../../../database/guild";
import { Resource } from "../../../database/resource";
import { User } from "../../../database/user";
import { Modal, createModalComposer, deleteReply, editReply, postponeReply, reply } from "../../../interactions";
import { verifyIsWithinLimits } from "../../../utils";
import { CommandTemplate } from "../../command";

const command: CommandTemplate = {
	id: "resource",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	handle: handleSubmitResource,
};

type ResourceError = "failure";

async function handleSubmitResource(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	let session = client.database.openSession();

	const guildDocument =
		client.documents.guilds.get(guildId.toString()) ??
		(await session.get<Guild>(`guilds/${guildId}`).then((value) => value ?? undefined));

	session.dispose();

	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.features.server.features?.resources;
	if (configuration === undefined || !configuration.enabled) {
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

	session = client.database.openSession();

	const userDocument =
		client.documents.users.get(interaction.user.id.toString()) ??
		(await session.get<User>(`users/${interaction.user.id}`).then((value) => value ?? undefined)) ??
		(await (async () => {
			const userDocument = {
				...({
					id: `users/${interaction.user.id}`,
					account: { id: interaction.user.id.toString() },
					createdAt: Date.now(),
				} satisfies User),
				"@metadata": { "@collection": "Users" },
			};
			await session.set(userDocument);
			await session.saveChanges();

			return userDocument as User;
		})());

	session.dispose();

	if (userDocument === undefined) {
		return;
	}

	const compositeIdPartial = `${guildId}/${interaction.user.id}`;
	const resourceDocuments = Array.from(client.documents.resources.entries())
		.filter(([key, _]) => key.startsWith(compositeIdPartial))
		.map(([_, value]) => value);
	const intervalMilliseconds = timeStructToMilliseconds(configuration.rateLimit?.within ?? defaults.RESOURCE_INTERVAL);
	if (
		!verifyIsWithinLimits(
			resourceDocuments.map((resourceDocument) => resourceDocument.createdAt),
			configuration.rateLimit?.uses ?? defaults.RESOURCE_LIMIT,
			intervalMilliseconds,
		)
	) {
		const strings = {
			title: client.localise("resource.strings.tooMany.title", locale)(),
			description: client.localise("resource.strings.tooMany.description", locale)(),
		};

		reply(client, interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
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
			await postponeReply(client, submission);

			const session = client.database.openSession();

			const createdAt = Date.now();
			const resourceDocument = {
				...({
					id: `resources/${guildId}/${userDocument.account.id}/${createdAt}`,
					guildId: guild.id.toString(),
					authorId: userDocument.account.id,
					answers,
					isResolved: false,
					createdAt,
				} satisfies Resource),
				"@metadata": { "@collection": "Resources" },
			};
			await session.set(resourceDocument);
			await session.saveChanges();
			session.dispose();

			if (configuration.journaling) {
				const journallingService = client.getJournallingService(guild.id);
				journallingService?.log("resourceSend", { args: [member, resourceDocument] });
			}

			const userId = BigInt(userDocument.account.id);

			const user = client.entities.users.get(userId);
			if (user === undefined) {
				return "failure";
			}

			const prompt = await resourceService.savePrompt(user, resourceDocument);
			if (prompt === undefined) {
				return "failure";
			}

			const compositeId = `${guild.id}/${user.id}/${createdAt}`;
			resourceService.registerDocument(compositeId, resourceDocument);
			resourceService.registerPrompt(prompt, userId, compositeId, resourceDocument);
			resourceService.registerHandler(compositeId);

			const strings = {
				title: client.localise("resource.strings.sent.title", locale)(),
				description: client.localise("resource.strings.sent.description", locale)(),
			};

			editReply(client, submission, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colors.lightGreen,
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
	submission: Discord.Interaction,
	error: ResourceError | undefined,
	{ locale }: { locale: Locale },
): Promise<Discord.Interaction | undefined> {
	const { promise, resolve } = Promise.withResolvers<Discord.Interaction | undefined>();

	const continueButton = new InteractionCollector({ only: [submission.user.id], isSingle: true });
	const cancelButton = new InteractionCollector({ only: [submission.user.id] });
	const returnButton = new InteractionCollector({
		only: [submission.user.id],
		isSingle: true,
		dependsOn: cancelButton,
	});
	const leaveButton = new InteractionCollector({
		only: [submission.user.id],
		isSingle: true,
		dependsOn: cancelButton,
	});

	continueButton.onCollect(async (buttonPress) => {
		deleteReply(client, submission);
		resolve(buttonPress);
	});

	cancelButton.onCollect(async (cancelButtonPress) => {
		returnButton.onCollect(async (returnButtonPress) => {
			deleteReply(client, submission);
			deleteReply(client, cancelButtonPress);
			resolve(returnButtonPress);
		});

		leaveButton.onCollect(async (_) => {
			deleteReply(client, submission);
			deleteReply(client, cancelButtonPress);
			resolve(undefined);
		});

		const strings = {
			title: client.localise("resource.strings.sureToCancel.title", locale)(),
			description: client.localise("resource.strings.sureToCancel.description", locale)(),
			stay: client.localise("prompts.stay", locale)(),
			leave: client.localise("prompts.leave", locale)(),
		};

		reply(client, cancelButtonPress, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
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

			editReply(client, submission, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colors.dullYellow,
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

	editReply(client, submission, {
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

export default command;
