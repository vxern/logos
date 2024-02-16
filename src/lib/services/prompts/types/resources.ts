import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import * as Logos from "../../../../types";
import { Client } from "../../../client";
import { Resource } from "../../../database/resource";
import { User } from "../../../database/user";
import diagnostics from "../../../diagnostics";
import { encodeId, getLocaleData } from "../../../interactions";
import { PromptService } from "../service";

type InteractionData = [documentId: string, isResolved: string];

class ResourceService extends PromptService<"resources", Resource, InteractionData> {
	constructor(client: Client, guildId: bigint) {
		super(client, guildId, { type: "resources", deleteMode: "delete" });
	}

	getAllDocuments(): Map<string, Resource> {
		const resources = new Map<string, Resource>();

		for (const [partialId, resourceDocument] of this.client.documents.resources) {
			if (resourceDocument.guildId !== this.guildIdString) {
				continue;
			}

			resources.set(partialId, resourceDocument);
		}

		return resources;
	}

	async getUserDocument(resourceDocument: Resource): Promise<User | undefined> {
		const session = this.client.database.openSession();

		const userDocument =
			this.client.documents.users.get(resourceDocument.authorId) ??
			session.get<User>(`users/${resourceDocument.authorId}`).then((value) => value ?? undefined);

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
			markResolved: this.client.localise("markResolved", guildLocale)(),
			markUnresolved: this.client.localise("markUnresolved", guildLocale)(),
			remove: this.client.localise("remove", guildLocale)(),
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

		const [partialId, isResolvedString] = data;
		const isResolved = isResolvedString === "true";

		const resourceDocument = this.documents.get(partialId);
		if (resourceDocument === undefined) {
			return undefined;
		}

		if (isResolved && resourceDocument.isResolved) {
			const strings = {
				title: this.client.localise("alreadyMarkedResolved.title", locale)(),
				description: this.client.localise("alreadyMarkedResolved.description", locale)(),
			};

			this.client.reply(interaction, {
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
				title: this.client.localise("alreadyMarkedUnresolved.title", locale)(),
				description: this.client.localise("alreadyMarkedUnresolved.description", locale)(),
			};

			this.client.reply(interaction, {
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

		await session.set(resourceDocument);
		await session.saveChanges();

		session.dispose();

		return resourceDocument;
	}
}

export { ResourceService };
