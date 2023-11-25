import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import defaults from "../../../../defaults";
import { trim } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import { timeStructToMilliseconds } from "../../../database/guild";
import { Guild } from "../../../database/guild";
import { Resource } from "../../../database/resource";
import { User } from "../../../database/user";
import {
	Modal,
	createInteractionCollector,
	createModalComposer,
	deleteReply,
	editReply,
	postponeReply,
	reply,
} from "../../../interactions";
import { verifyIsWithinLimits } from "../../../utils";
import { CommandTemplate } from "../../command";

const command: CommandTemplate = {
	name: "resource",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	handle: handleSubmitResource,
};

type ResourceError = "failure";

async function handleSubmitResource(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	let session = client.database.openSession();

	const guildDocument =
		client.cache.documents.guilds.get(guildId.toString()) ??
		(await session.load<Guild>(`guilds/${guildId}`).then((value) => value ?? undefined));

	session.dispose();

	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.features.server.features?.resources;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const member = interaction.member;
	if (member === undefined) {
		return;
	}

	session = client.database.openSession();

	const userDocument =
		client.cache.documents.users.get(interaction.user.id.toString()) ??
		(await session.load<User>(`users/${interaction.user.id}`).then((value) => value ?? undefined)) ??
		(await (async () => {
			const userDocument = {
				...({
					id: `users/${interaction.user.id}`,
					account: { id: interaction.user.id.toString() },
					createdAt: Date.now(),
				} satisfies User),
				"@metadata": { "@collection": "Users" },
			};
			await session.store(userDocument);
			await session.saveChanges();

			return userDocument as User;
		})());

	session.dispose();

	if (userDocument === undefined) {
		return;
	}

	const compositeIdPartial = `${guildId}/${interaction.user.id}`;
	const resourceDocuments = Array.from(client.cache.documents.resources.entries())
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
			title: localise(client, "resource.strings.tooMany.title", locale)(),
			description: localise(client, "resource.strings.tooMany.description", locale)(),
		};

		reply([client, bot], interaction, {
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

	const resourceService = client.services.prompts.resources.get(guild.id);
	if (resourceService === undefined) {
		return;
	}

	createModalComposer<Resource["answers"]>([client, bot], interaction, {
		modal: generateResourceModal(client, { locale }),
		onSubmit: async (submission, answers) => {
			await postponeReply([client, bot], submission);

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
			await session.store(resourceDocument);
			await session.saveChanges();
			session.dispose();

			if (configuration.journaling) {
				const journallingService = client.services.journalling.get(guild.id);
				journallingService?.log("resourceSend", { args: [member, resourceDocument] });
			}

			const userId = BigInt(userDocument.account.id);

			const user = client.cache.users.get(userId);
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
				title: localise(client, "resource.strings.sent.title", locale)(),
				description: localise(client, "resource.strings.sent.description", locale)(),
			};

			editReply([client, bot], submission, {
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
			handleSubmittedInvalidResource([client, bot], submission, error as ResourceError | undefined, { locale }),
	});
}

async function handleSubmittedInvalidResource(
	[client, bot]: [Client, Discord.Bot],
	submission: Discord.Interaction,
	error: ResourceError | undefined,
	{ locale }: { locale: Locale },
): Promise<Discord.Interaction | undefined> {
	return new Promise((resolve) => {
		const continueId = createInteractionCollector([client, bot], {
			type: Discord.InteractionTypes.MessageComponent,
			onCollect: async (selection) => {
				deleteReply([client, bot], submission);
				resolve(selection);
			},
		});

		const cancelId = createInteractionCollector([client, bot], {
			type: Discord.InteractionTypes.MessageComponent,
			onCollect: async (cancelSelection) => {
				const returnId = createInteractionCollector([client, bot], {
					type: Discord.InteractionTypes.MessageComponent,
					onCollect: async (returnSelection) => {
						deleteReply([client, bot], submission);
						deleteReply([client, bot], cancelSelection);
						resolve(returnSelection);
					},
				});

				const leaveId = createInteractionCollector([client, bot], {
					type: Discord.InteractionTypes.MessageComponent,
					onCollect: async (_) => {
						deleteReply([client, bot], submission);
						deleteReply([client, bot], cancelSelection);
						resolve(undefined);
					},
				});

				const strings = {
					title: localise(client, "resource.strings.sureToCancel.title", locale)(),
					description: localise(client, "resource.strings.sureToCancel.description", locale)(),
					stay: localise(client, "prompts.stay", locale)(),
					leave: localise(client, "prompts.leave", locale)(),
				};

				reply([client, bot], cancelSelection, {
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
									customId: returnId,
									label: strings.stay,
									style: Discord.ButtonStyles.Success,
								},
								{
									type: Discord.MessageComponentTypes.Button,
									customId: leaveId,
									label: strings.leave,
									style: Discord.ButtonStyles.Danger,
								},
							],
						},
					],
				});
			},
		});

		let embed!: Discord.CamelizedDiscordEmbed;
		switch (error) {
			default: {
				const strings = {
					title: localise(client, "resource.strings.failed", locale)(),
					description: localise(client, "resource.strings.failed", locale)(),
				};

				editReply([client, bot], submission, {
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
			continue: localise(client, "prompts.continue", locale)(),
			cancel: localise(client, "prompts.cancel", locale)(),
		};

		editReply([client, bot], submission, {
			embeds: [embed],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							type: Discord.MessageComponentTypes.Button,
							customId: continueId,
							label: strings.continue,
							style: Discord.ButtonStyles.Success,
						},
						{
							type: Discord.MessageComponentTypes.Button,
							customId: cancelId,
							label: strings.cancel,
							style: Discord.ButtonStyles.Danger,
						},
					],
				},
			],
		});
	});
}

function generateResourceModal(client: Client, { locale }: { locale: Locale }): Modal<Resource["answers"]> {
	const strings = {
		title: localise(client, "resource.title", locale)(),
		resource: localise(client, "resource.fields.resource", locale)(),
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
