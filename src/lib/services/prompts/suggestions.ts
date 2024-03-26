import diagnostics from "logos:core/diagnostics";
import { Client } from "logos/client";
import { Suggestion } from "logos/database/suggestion";
import { User } from "logos/database/user";
import { PromptService } from "logos/services/prompts/service";

class SuggestionPromptService extends PromptService<{
	type: "suggestions";
	model: Suggestion;
	metadata: [partialId: string, isResolve: string];
}> {
	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "SuggestionPromptService", guildId }, { type: "suggestions", deleteMode: "delete" });
	}

	getAllDocuments(): Map<string, Suggestion> {
		const suggestions = new Map<string, Suggestion>();

		for (const [partialId, suggestionDocument] of this.client.documents.suggestions) {
			if (suggestionDocument.guildId !== this.guildIdString) {
				continue;
			}

			suggestions.set(partialId, suggestionDocument);
		}

		return suggestions;
	}

	async getUserDocument(suggestionDocument: Suggestion): Promise<User> {
		return await User.getOrCreate(this.client, { userId: suggestionDocument.authorId });
	}

	getPromptContent(user: Logos.User, suggestionDocument: Suggestion): Discord.CreateMessageOptions | undefined {
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
					description: `*${suggestionDocument.answers.suggestion}*`,
					color: suggestionDocument.isResolved ? constants.colours.green : constants.colours.dullYellow,
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
						})()}&metadata=${suggestionDocument.partialId}`,
					},
				},
			],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: suggestionDocument.isResolved
						? [
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Success,
									label: strings.markUnresolved,
									customId: this.magicButton.encodeId([suggestionDocument.partialId, `${false}`]),
								},
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Danger,
									label: strings.remove,
									customId: this.removeButton.encodeId([suggestionDocument.partialId]),
								},
						  ]
						: [
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Primary,
									label: strings.markResolved,
									customId: this.magicButton.encodeId([suggestionDocument.partialId, `${true}`]),
								},
						  ],
				},
			],
		};
	}

	async handlePromptInteraction(
		interaction: Logos.Interaction<[partialId: string, isResolve: string]>,
	): Promise<Suggestion | null | undefined> {
		const locale = interaction.locale;

		const suggestionDocument = this.documents.get(interaction.metadata[0]);
		if (suggestionDocument === undefined) {
			return undefined;
		}

		const isResolved = interaction.metadata[1] === "true";

		if (isResolved && suggestionDocument.isResolved) {
			const strings = {
				title: this.client.localise("alreadyMarkedResolved.title", locale)(),
				description: this.client.localise("alreadyMarkedResolved.description", locale)(),
			};

			await this.client.warning(interaction, {
				title: strings.title,
				description: strings.description,
			});

			return;
		}

		if (!(isResolved || suggestionDocument.isResolved)) {
			const strings = {
				title: this.client.localise("alreadyMarkedUnresolved.title", locale)(),
				description: this.client.localise("alreadyMarkedUnresolved.description", locale)(),
			};

			await this.client.warning(interaction, {
				title: strings.title,
				description: strings.description,
			});

			return;
		}

		await suggestionDocument.update(this.client, () => {
			suggestionDocument.isResolved = isResolved;
		});

		return suggestionDocument;
	}
}

export { SuggestionPromptService };
