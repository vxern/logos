import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { MentionTypes, mention, timestamp } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import { Suggestion } from "../../../database/suggestion";
import { User } from "../../../database/user";
import { encodeId, getLocaleData, reply } from "../../../interactions";
import { getGuildIconURLFormatted } from "../../../utils";
import { PromptService } from "../service";

type InteractionData = [documentId: string, isResolved: string];

class SuggestionService extends PromptService<"suggestions", Suggestion, InteractionData> {
	constructor([client, bot]: [Client, Discord.Bot], guildId: bigint) {
		super([client, bot], guildId, { type: "suggestions" });
	}

	getAllDocuments(): Map<string, Suggestion> {
		const suggestions = new Map<string, Suggestion>();

		for (const [compositeId, suggestion] of this.client.cache.documents.suggestions) {
			if (suggestion.guildId !== this.guildIdString) {
				continue;
			}

			suggestions.set(compositeId, suggestion);
		}

		return suggestions;
	}

	async getUserDocument(suggestionDocument: Suggestion): Promise<User | undefined> {
		const session = this.client.database.openSession();

		const userDocument =
			this.client.cache.documents.users.get(suggestionDocument.authorId) ??
			session.load<User>(`users/${suggestionDocument.authorId}`).then((value) => value ?? undefined);

		session.dispose();

		return userDocument;
	}

	getPromptContent(user: Logos.User, suggestionDocument: Suggestion): Discord.CreateMessageOptions | undefined {
		const guild = this.guild;
		if (guild === undefined) {
			return undefined;
		}

		const guildLocale = this.guildLocale;
		const strings = {
			suggestion: {
				submittedBy: localise(this.client, "submittedBy", guildLocale)(),
				submittedAt: localise(this.client, "submittedAt", guildLocale)(),
			},
			markResolved: localise(this.client, "markResolved", guildLocale)(),
			markUnresolved: localise(this.client, "markUnresolved", guildLocale)(),
		};

		return {
			embeds: [
				{
					title: suggestionDocument.answers.suggestion,
					color: constants.colors.green,
					thumbnail: (() => {
						const iconURL = Discord.avatarUrl(user.id, user.discriminator, {
							avatar: user.avatar,
							size: 64,
							format: "png",
						});
						if (iconURL === undefined) {
							return;
						}

						return { url: iconURL };
					})(),
					fields: [
						{
							name: strings.suggestion.submittedBy,
							value: mention(user.id, MentionTypes.User),
							inline: true,
						},
						{
							name: strings.suggestion.submittedAt,
							value: timestamp(suggestionDocument.createdAt),
							inline: true,
						},
					],
					footer: {
						text: guild.name,
						iconUrl: `${getGuildIconURLFormatted(guild)}&metadata=${suggestionDocument.guildId}/${
							suggestionDocument.authorId
						}/${suggestionDocument.createdAt}`,
					},
				},
			],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						suggestionDocument.isResolved
							? {
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Secondary,
									label: strings.markUnresolved,
									customId: encodeId<InteractionData>(constants.components.suggestions, [
										`${suggestionDocument.guildId}/${suggestionDocument.authorId}/${suggestionDocument.createdAt}`,
										`${false}`,
									]),
							  }
							: {
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Primary,
									label: strings.markResolved,
									customId: encodeId<InteractionData>(constants.components.suggestions, [
										`${suggestionDocument.guildId}/${suggestionDocument.authorId}/${suggestionDocument.createdAt}`,
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
	): Promise<Suggestion | null | undefined> {
		const localeData = await getLocaleData(this.client, interaction);
		const locale = localeData.locale;

		const [documentId, isResolvedString] = data;
		const isResolved = isResolvedString === "true";

		const suggestionDocument = this.documents.get(documentId);
		if (suggestionDocument === undefined) {
			return undefined;
		}

		if (isResolved && suggestionDocument.isResolved) {
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

		if (!(isResolved || suggestionDocument.isResolved)) {
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

		suggestionDocument.isResolved = isResolved;

		await session.store(suggestionDocument);
		await session.saveChanges();

		session.dispose();

		return suggestionDocument;
	}
}

export { SuggestionService };
