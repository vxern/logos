import constants from "../../../../constants.js";
import { MentionTypes, mention, timestamp } from "../../../../formatting.js";
import { defaultLocale } from "../../../../types.js";
import { Client, localise } from "../../../client.js";
import { stringifyValue } from "../../../database/database.js";
import { Document } from "../../../database/document.js";
import { Suggestion } from "../../../database/structs/suggestion.js";
import { User } from "../../../database/structs/user.js";
import { encodeId, reply } from "../../../interactions.js";
import { getGuildIconURLFormatted } from "../../../utils.js";
import { PromptService } from "../service.js";
import * as Discord from "discordeno";

type Metadata = { userId: bigint; reference: string };
type InteractionData = [userId: string, guildId: string, reference: string, isResolved: string];

class SuggestionService extends PromptService<"suggestions", Suggestion, Metadata, InteractionData> {
	constructor(client: Client, guildId: bigint) {
		super(client, guildId, { type: "suggestions" });
	}

	getAllDocuments(): Document<Suggestion>[] {
		const suggestionsAll: Document<Suggestion>[] = [];

		for (const [compositeId, suggestions] of this.client.database.cache.suggestionsByAuthorAndGuild.entries()) {
			const [_, guildIdString] = compositeId.split(constants.symbols.meta.idSeparator);
			if (guildIdString === undefined) {
				continue;
			}

			if (guildIdString !== this.guildIdString) {
				continue;
			}

			suggestionsAll.push(...suggestions.values());
		}

		return suggestionsAll;
	}

	getUserDocument(document: Document<Suggestion>): Promise<Document<User> | undefined> {
		return this.client.database.adapters.users.getOrFetch(this.client, "reference", document.data.author);
	}

	decodeMetadata(data: string[]): Metadata | undefined {
		const [userId, reference] = data;
		if (userId === undefined || reference === undefined) {
			return undefined;
		}

		return { userId: BigInt(userId), reference };
	}

	getPromptContent(
		bot: Discord.Bot,
		user: Discord.User,
		document: Document<Suggestion>,
	): Discord.CreateMessage | undefined {
		const guild = this.guild;
		if (guild === undefined) {
			return undefined;
		}

		const reference = stringifyValue(document.ref);

		const strings = {
			suggestion: {
				submittedBy: localise(this.client, "submittedBy", defaultLocale)(),
				submittedAt: localise(this.client, "submittedAt", defaultLocale)(),
			},
			markResolved: localise(this.client, "markResolved", defaultLocale)(),
			markUnresolved: localise(this.client, "markUnresolved", defaultLocale)(),
		};

		return {
			embeds: [
				{
					title: document.data.answers.suggestion,
					color: constants.colors.green,
					thumbnail: (() => {
						const iconURL = Discord.getAvatarURL(bot, user.id, user.discriminator, {
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
							value: timestamp(document.data.createdAt),
							inline: true,
						},
					],
					footer: {
						text: guild.name,
						iconUrl: `${getGuildIconURLFormatted(
							bot,
							guild,
						)}&metadata=${`${user.id}${constants.symbols.meta.metadataSeparator}${reference}`}`,
					},
				},
			],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						document.data.isResolved
							? {
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Secondary,
									label: strings.markUnresolved,
									customId: encodeId<InteractionData>(constants.staticComponentIds.suggestions, [
										user.id.toString(),
										this.guildIdString,
										reference,
										`${false}`,
									]),
							  }
							: {
									type: Discord.MessageComponentTypes.Button,
									style: Discord.ButtonStyles.Primary,
									label: strings.markResolved,
									customId: encodeId<InteractionData>(constants.staticComponentIds.suggestions, [
										user.id.toString(),
										this.guildIdString,
										reference,
										`${true}`,
									]),
							  },
					],
				},
			],
		};
	}

	async handleInteraction(
		bot: Discord.Bot,
		interaction: Discord.Interaction,
		data: InteractionData,
	): Promise<Document<Suggestion> | null | undefined> {
		const [userId, guildId, reference, isResolvedString] = data;
		const isResolved = isResolvedString === "true";

		const user = await this.client.database.adapters.users.getOrFetchOrCreate(
			this.client,
			"id",
			userId,
			BigInt(userId),
		);
		if (user === undefined) {
			return undefined;
		}

		const documents = this.client.database.adapters.suggestions.get(this.client, "authorAndGuild", [user.ref, guildId]);
		if (documents === undefined) {
			return undefined;
		}

		const document = documents.get(reference);
		if (document === undefined) {
			return undefined;
		}

		if (isResolved && document.data.isResolved) {
			const strings = {
				title: localise(this.client, "alreadyMarkedResolved.title", defaultLocale)(),
				description: localise(this.client, "alreadyMarkedResolved.description", defaultLocale)(),
			};

			reply([this.client, bot], interaction, {
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

		if (!(isResolved || document.data.isResolved)) {
			const strings = {
				title: localise(this.client, "alreadyMarkedUnresolved.title", defaultLocale)(),
				description: localise(this.client, "alreadyMarkedUnresolved.description", defaultLocale)(),
			};

			reply([this.client, bot], interaction, {
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

		const updatedDocument = await this.client.database.adapters.suggestions.update(this.client, {
			...document,
			data: { ...document.data, isResolved },
		});

		return updatedDocument;
	}
}

export { SuggestionService };
