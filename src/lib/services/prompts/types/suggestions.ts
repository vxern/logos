import constants from "../../../../constants/constants";
import { MentionTypes, mention, timestamp } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import { stringifyValue } from "../../../database/database";
import { Document } from "../../../database/document";
import { Suggestion } from "../../../database/structs/suggestion";
import { User } from "../../../database/structs/user";
import { encodeId, getLocaleData, reply } from "../../../interactions";
import { getGuildIconURLFormatted } from "../../../utils";
import { PromptService } from "../service";
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
		user: Logos.User,
		document: Document<Suggestion>,
	): Discord.CreateMessage | undefined {
		const guild = this.guild;
		if (guild === undefined) {
			return undefined;
		}

		const reference = stringifyValue(document.ref);

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
									customId: encodeId<InteractionData>(constants.components.suggestions, [
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
									customId: encodeId<InteractionData>(constants.components.suggestions, [
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
		const localeData = await getLocaleData(this.client, interaction);
		const locale = localeData.locale;

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
				title: localise(this.client, "alreadyMarkedResolved.title", locale)(),
				description: localise(this.client, "alreadyMarkedResolved.description", locale)(),
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
				title: localise(this.client, "alreadyMarkedUnresolved.title", locale)(),
				description: localise(this.client, "alreadyMarkedUnresolved.description", locale)(),
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
