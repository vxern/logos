import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import { Resource } from "../../../database/resource";
import { User } from "../../../database/user";
import diagnostics from "../../../diagnostics";
import { encodeId, getLocaleData, reply } from "../../../interactions";
import { PromptService } from "../service";

type InteractionData = [documentId: string, isResolved: string];

class ResourceService extends PromptService<"resources", Resource, InteractionData> {
	constructor([client, bot]: [Client, Discord.Bot], guildId: bigint) {
		super([client, bot], guildId, { type: "resources", deleteMode: "delete" });
	}

	getAllDocuments(): Map<string, Resource> {
		const resources = new Map<string, Resource>();

		for (const [compositeId, resourceDocument] of this.client.cache.documents.resources) {
			if (resourceDocument.guildId !== this.guildIdString) {
				continue;
			}

			resources.set(compositeId, resourceDocument);
		}

		return resources;
	}

	async getUserDocument(resourceDocument: Resource): Promise<User | undefined> {
		const session = this.client.database.openSession();

		const userDocument =
			this.client.cache.documents.users.get(resourceDocument.authorId) ??
			session.load<User>(`users/${resourceDocument.authorId}`).then((value) => value ?? undefined);

		session.dispose();

		return userDocument;
	}

	getPromptContent(user: Logos.User, resourceDocument: Resource): Discord.CreateMessageOptions | undefined {
		const guild = this.guild;
		if (guild === undefined) {
			return undefined;
		}

		const guildLocale = this.guildLocale;
		const strings = {
			markResolved: localise(this.client, "markResolved", guildLocale)(),
			markUnresolved: localise(this.client, "markUnresolved", guildLocale)(),
			remove: localise(this.client, "remove", guildLocale)(),
		};

		return {
			embeds: [
				{
					color: resourceDocument.isResolved ? constants.colors.green : constants.colors.gray,
					description: `*${resourceDocument.answers.resource}*`,
					footer: {
						text: diagnostics.display.user(user),
						iconUrl: `${(() => {
							const iconURL = Discord.avatarUrl(user.id, user.discriminator, {
								avatar: user.avatar,
								size: 64,
								format: "png",
							});
							if (iconURL === undefined) {
								return;
							}

							return iconURL;
						})()}&metadata=${resourceDocument.guildId}/${resourceDocument.authorId}/${resourceDocument.createdAt}`,
					},
				},
			],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: resourceDocument.isResolved
						? [
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Success,
									label: strings.markUnresolved,
									customId: encodeId<InteractionData>(constants.components.resources, [
										`${resourceDocument.guildId}/${resourceDocument.authorId}/${resourceDocument.createdAt}`,
										`${false}`,
									]),
								},
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Danger,
									label: strings.remove,
									customId: encodeId(
										`${constants.components.removePrompt}/${constants.components.resources}/${this.guildId}`,
										[`${resourceDocument.guildId}/${resourceDocument.authorId}/${resourceDocument.createdAt}`],
									),
								},
						  ]
						: [
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Primary,
									label: strings.markResolved,
									customId: encodeId<InteractionData>(constants.components.resources, [
										`${resourceDocument.guildId}/${resourceDocument.authorId}/${resourceDocument.createdAt}`,
										`${true}`,
									]),
								},
						  ],
				},
			],
		};
	}

	async handleInteraction(
		interaction: Discord.Interaction,
		data: InteractionData,
	): Promise<Resource | null | undefined> {
		const localeData = await getLocaleData(this.client, interaction);
		const locale = localeData.locale;

		const [compositeId, isResolvedString] = data;
		const isResolved = isResolvedString === "true";

		const resourceDocument = this.documents.get(compositeId);
		if (resourceDocument === undefined) {
			return undefined;
		}

		if (isResolved && resourceDocument.isResolved) {
			const strings = {
				title: localise(this.client, "alreadyMarkedResolved.title", locale)(),
				description: localise(this.client, "alreadyMarkedResolved.description", locale)(),
			};

			reply([this.client, this.bot], interaction, {
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

		if (!(isResolved || resourceDocument.isResolved)) {
			const strings = {
				title: localise(this.client, "alreadyMarkedUnresolved.title", locale)(),
				description: localise(this.client, "alreadyMarkedUnresolved.description", locale)(),
			};

			reply([this.client, this.bot], interaction, {
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

		const session = this.client.database.openSession();

		resourceDocument.isResolved = isResolved;

		await session.store(resourceDocument);
		await session.saveChanges();

		session.dispose();

		return resourceDocument;
	}
}

export { ResourceService };
