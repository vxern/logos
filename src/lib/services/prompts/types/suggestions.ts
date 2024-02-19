import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import * as Logos from "../../../../types";
import { Client } from "../../../client";
import { Suggestion } from "../../../database/suggestion";
import { User } from "../../../database/user";
import diagnostics from "../../../diagnostics";
import { encodeId, getLocaleData } from "../../../interactions";
import { PromptService } from "../service";

type InteractionData = [documentId: string, isResolved: string];

class SuggestionService extends PromptService<"suggestions", Suggestion, InteractionData> {
	constructor(client: Client, guildId: bigint) {
		super(client, guildId, { type: "suggestions", deleteMode: "delete" });
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
		const userDocument = await User.getOrCreate(this.client, { userId: suggestionDocument.authorId });

		return userDocument;
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
					color: suggestionDocument.isResolved ? constants.colors.green : constants.colors.dullYellow,
					description: `*${suggestionDocument.answers.suggestion}*`,
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
									customId: encodeId<InteractionData>(constants.components.suggestions, [
										suggestionDocument.partialId,
										`${false}`,
									]),
								},
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Danger,
									label: strings.remove,
									customId: encodeId(
										`${constants.components.removePrompt}/${constants.components.suggestions}/${this.guildId}`,
										[suggestionDocument.partialId],
									),
								},
						  ]
						: [
								{
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Primary,
									label: strings.markResolved,
									customId: encodeId<InteractionData>(constants.components.suggestions, [
										suggestionDocument.partialId,
										`${true}`,
									]),
								},
						  ],
				},
			],
		};
	}

	async handleInteraction(
		interaction: Logos.Interaction,
		data: InteractionData,
	): Promise<Suggestion | null | undefined> {
		const localeData = await getLocaleData(this.client, interaction);
		const locale = localeData.locale;

		const [partialId, isResolvedString] = data;
		const isResolved = isResolvedString === "true";

		const suggestionDocument = this.documents.get(partialId);
		if (suggestionDocument === undefined) {
			return undefined;
		}

		if (isResolved && suggestionDocument.isResolved) {
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

		if (!(isResolved || suggestionDocument.isResolved)) {
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

		await suggestionDocument.update(this.client, () => {
			suggestionDocument.isResolved = isResolved;
		});

		return suggestionDocument;
	}
}

export { SuggestionService };
