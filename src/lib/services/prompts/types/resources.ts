import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import * as Logos from "../../../../types";
import { Client } from "../../../client";
import { Resource } from "../../../database/resource";
import { User } from "../../../database/user";
import diagnostics from "../../../diagnostics";
import { PromptService } from "../service";

class ResourceService extends PromptService<{
	type: "resources";
	model: Resource;
	metadata: [partialId: string, isResolve: string];
}> {
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

	async getUserDocument(resourceDocument: Resource): Promise<User> {
		const userDocument = await User.getOrCreate(this.client, { userId: resourceDocument.authorId });

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
						})()}&metadata=${resourceDocument.partialId}`,
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
										resourceDocument.partialId,
										`${false}`,
									]),
								},
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Danger,
									label: strings.remove,
									customId: encodeId(
										`${constants.components.removePrompt}/${constants.components.resources}/${this.guildId}`,
										[resourceDocument.partialId],
									),
								},
						  ]
						: [
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Primary,
									label: strings.markResolved,
									customId: encodeId<InteractionData>(constants.components.resources, [
										resourceDocument.partialId,
										`${true}`,
									]),
								},
						  ],
				},
			],
		};
	}

	async handlePromptInteraction(
		interaction: Logos.Interaction<[partialId: string, isResolve: string]>,
	): Promise<Resource | null | undefined> {
		const locale = interaction.locale;

		const resourceDocument = this.documents.get(interaction.metadata[0]);
		if (resourceDocument === undefined) {
			return undefined;
		}

		const isResolved = interaction.metadata[1] === "true";

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

		await resourceDocument.update(this.client, () => {
			resourceDocument.isResolved = isResolved;
		});

		return resourceDocument;
	}
}

export { ResourceService };
