import type { Client } from "logos/client";
import type { Resource } from "logos/database/resource";
import { User } from "logos/database/user";
import { PromptService } from "logos/services/prompts/service";

class ResourcePromptService extends PromptService<{
	type: "resources";
	model: Resource;
	metadata: [partialId: string, isResolve: string];
}> {
	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "ResourcePromptService", guildId }, { type: "resources", deleteMode: "delete" });
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
		return await User.getOrCreate(this.client, { userId: resourceDocument.authorId });
	}

	getPromptContent(user: Logos.User, resourceDocument: Resource): Discord.CreateMessageOptions | undefined {
		const strings = constants.contexts.promptControls({
			localise: this.client.localise.bind(this.client),
			locale: this.guildLocale,
		});
		return {
			embeds: [
				{
					description: `*${resourceDocument.formData.resource}*`,
					color: resourceDocument.isResolved ? constants.colours.green : constants.colours.gray,
					footer: {
						text: this.client.diagnostics.user(user),
						iconUrl: PromptService.encodePartialIdInUserAvatar({
							user,
							partialId: resourceDocument.partialId,
						}),
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
									customId: this.magicButton.encodeId([resourceDocument.partialId, `${false}`]),
								},
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Danger,
									label: strings.remove,
									customId: this.removeButton.encodeId([resourceDocument.partialId]),
								},
						  ]
						: [
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Primary,
									label: strings.markResolved,
									customId: this.magicButton.encodeId([resourceDocument.partialId, `${true}`]),
								},
						  ],
				},
			],
		};
	}

	async handlePromptInteraction(
		interaction: Logos.Interaction<[partialId: string, isResolve: string]>,
	): Promise<Resource | null | undefined> {
		const resourceDocument = this.documents.get(interaction.metadata[1]);
		if (resourceDocument === undefined) {
			return undefined;
		}

		const isResolved = interaction.metadata[2] === "true";
		if (isResolved && resourceDocument.isResolved) {
			const strings = constants.contexts.alreadyMarkedResolved({
				localise: this.client.localise.bind(this.client),
				locale: interaction.locale,
			});
			await this.client.warning(interaction, {
				title: strings.title,
				description: strings.description,
			});
			return;
		}

		if (!(isResolved || resourceDocument.isResolved)) {
			const strings = constants.contexts.alreadyMarkedUnresolved({
				localise: this.client.localise.bind(this.client),
				locale: interaction.locale,
			});
			await this.client.warning(interaction, {
				title: strings.title,
				description: strings.description,
			});
			return;
		}

		await resourceDocument.update(this.client, () => {
			resourceDocument.isResolved = isResolved;
		});

		return resourceDocument;
	}
}

export { ResourcePromptService };