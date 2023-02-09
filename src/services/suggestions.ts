import {
	ApplicationCommandFlags,
	Bot,
	ButtonStyles,
	CreateMessage,
	deleteMessage,
	getAvatarURL,
	Guild,
	InteractionResponseTypes,
	InteractionTypes,
	Message,
	MessageComponentTypes,
	sendInteractionResponse,
	sendMessage,
	User as DiscordUser,
} from 'discordeno';
import { lodash } from 'lodash';
import { localise, Services } from 'logos/assets/localisations/mod.ts';
import { Suggestion } from 'logos/src/database/structs/mod.ts';
import { Document, Reference } from 'logos/src/database/document.ts';
import { stringifyValue } from 'logos/src/database/database.ts';
import { ServiceStarter } from 'logos/src/services/services.ts';
import { Client, extendEventHandler, WithLanguage } from 'logos/src/client.ts';
import { createInteractionCollector, InteractionCollectorSettings } from 'logos/src/interactions.ts';
import { diagnosticMentionUser, getAllMessages, getTextChannel } from 'logos/src/utils.ts';
import { defaultLocale } from 'logos/types.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';
import { mention, MentionTypes, timestamp } from 'logos/formatting.ts';

const suggestionPromptHandlers = new Map<string, NonNullable<InteractionCollectorSettings['onCollect']>>();

const service: ServiceStarter = ([client, bot]) => {
	setupActionHandler([client, bot]);
	registerPastSuggestions([client, bot]);
	ensureSuggestionPromptPersistence([client, bot]);
};

function setupActionHandler([client, bot]: [Client, Bot]): void {
	createInteractionCollector([client, bot], {
		type: InteractionTypes.MessageComponent,
		customId: constants.staticComponentIds.suggestions,
		doesNotExpire: true,
		onCollect: (_, selection) => {
			const [__, authorId, guildId, suggestionReference, ___] = selection.data!.customId!.split('|');

			const handle = suggestionPromptHandlers.get(`${authorId}|${guildId}|${suggestionReference}`);
			if (handle === undefined) return;

			return void handle(bot, selection);
		},
	});
}

interface SuggestionPromptMetadata {
	authorId: bigint;
	suggestionReferenceId: string;
}

function extractMetadata(prompt: Message): SuggestionPromptMetadata | undefined {
	const metadata = prompt.embeds.at(0)?.footer?.text;
	if (metadata === undefined) return undefined;

	const [authorId, suggestionReferenceId] = metadata.split(constants.symbols.meta.metadataSeparator);
	if (authorId === undefined || suggestionReferenceId === undefined) return undefined;

	return { authorId: BigInt(authorId), suggestionReferenceId };
}

function getValidPrompts(bot: Bot, prompts: Message[]): Message[] {
	return prompts.filter(
		(prompt) => {
			if (extractMetadata(prompt) === undefined) {
				deleteMessage(bot, prompt.channelId, prompt.id);
				return false;
			}

			return true;
		},
	);
}

const suggestionChannelIdByGuildId = new Map<bigint, bigint>();
const suggestionByMessageId = new Map<bigint, Document<Suggestion>>();
const authorIdByMessageId = new Map<bigint, bigint>();
const messageIdBySuggestionReferenceId = new Map<string, bigint>();

function registerPastSuggestions([client, bot]: [Client, Bot]): void {
	const suggestionsByGuildId = new Map<bigint, Document<Suggestion>[]>();
	{
		const suggestionsByAuthorAndGuild = Array.from(client.database.cache.suggestionsByAuthorAndGuild.values())
			.map((suggestions) => Array.from(suggestions.values()));

		for (const suggestions of suggestionsByAuthorAndGuild) {
			if (suggestions.length === 0) continue;

			const guildId = BigInt(suggestions[0]!.data.guild);

			if (!suggestionsByGuildId.has(guildId)) {
				suggestionsByGuildId.set(guildId, suggestions);
				continue;
			}

			suggestionsByGuildId.get(guildId)!.push(...suggestions);
		}
	}

	extendEventHandler(bot, 'guildCreate', { append: true }, async (bot, guild_) => {
		const guild = client.cache.guilds.get(guild_.id)!;

		const suggestionChannelId = getTextChannel(guild, configuration.guilds.channels.suggestions)?.id;
		if (suggestionChannelId === undefined) {
			client.log.error(
				`Failed to register previous suggestions on ${guild.name}: There is no suggestion channel.`,
			);
			return;
		}

		suggestionChannelIdByGuildId.set(guild.id, suggestionChannelId);

		const suggestionPromptsAll = await getAllMessages(bot, suggestionChannelId);
		const suggestionPrompts = getValidPrompts(bot, suggestionPromptsAll);
		const suggestionPromptsByAuthorId = new Map<bigint, Map<string, Message>>();

		for (const prompt of suggestionPrompts) {
			const { authorId, suggestionReferenceId } = extractMetadata(prompt)!;

			if (!suggestionPromptsByAuthorId.has(authorId)) {
				suggestionPromptsByAuthorId.set(authorId, new Map([[suggestionReferenceId, prompt]]));
				continue;
			}

			suggestionPromptsByAuthorId.get(authorId)!.set(suggestionReferenceId, prompt);
		}

		const suggestions = suggestionsByGuildId.get(guild.id) ?? [];

		for (const suggestion of suggestions) {
			const authorReferenceId = BigInt(stringifyValue(suggestion.data.author));

			const authorDocument = await client.database.adapters.users.getOrFetch(
				client,
				'reference',
				suggestion.data.author,
			);
			if (authorDocument === undefined) {
				client.log.error(
					`Failed to register suggestion submitted by user with reference ${authorReferenceId} to guild ${guild.name}: ` +
						`Could not get the user document.`,
				);
				continue;
			}

			const authorId = BigInt(authorDocument.data.account.id);
			const suggestionReferenceId = stringifyValue(suggestion.ref);

			let messageId!: bigint;
			const prompt = suggestionPromptsByAuthorId.get(authorId)?.get(suggestionReferenceId);

			if (prompt === undefined) {
				const author = client.cache.users.get(authorId);
				if (author === undefined) {
					client.log.error(
						`Failed to register suggestion submitted by user with ID ${authorId} to guild ${guild.name}: ` +
							`The user is not cached.`,
					);
					continue;
				}

				messageId = await sendMessage(bot, suggestionChannelId, getSuggestionPrompt(bot, guild, author, suggestion))
					.then((message) => message.id);
			} else {
				suggestionPromptsByAuthorId.get(authorId)!.delete(suggestionReferenceId);
				messageId = prompt.id;
			}

			suggestionByMessageId.set(messageId, suggestion);
			authorIdByMessageId.set(messageId, authorId);
			messageIdBySuggestionReferenceId.set(suggestionReferenceId, messageId);

			registerSuggestionHandler(
				client,
				guild.id,
				suggestionChannelId,
				[authorId, authorDocument.ref],
				suggestionReferenceId,
			);
		}

		// These are the prompts which aren't connected to any suggestion.
		const remainingSuggestionPrompts = Array.from(suggestionPromptsByAuthorId.values())
			.map((map) => Array.from(map.values()))
			.flat();
		for (const prompt of remainingSuggestionPrompts) {
			deleteMessage(bot, prompt.channelId, prompt.id);
		}
	});
}

function ensureSuggestionPromptPersistence([client, bot]: [Client, Bot]): void {
	// Anti-tampering feature; detects suggestion prompts being deleted.
	extendEventHandler(bot, 'messageDelete', { prepend: true }, async (_, { id, channelId, guildId }) => {
		// If the message was deleted from any other channel apart from a suggestion channel.
		if (suggestionChannelIdByGuildId.get(guildId!) !== channelId) {
			return;
		}

		const suggestion = suggestionByMessageId.get(id);
		if (suggestion === undefined) return;

		const authorId = authorIdByMessageId.get(id);
		if (authorId === undefined) return;

		const author = client.cache.users.get(authorId);
		if (author === undefined) return;

		const guild = client.cache.guilds.get(guildId!)!;

		const newMessageId = await sendMessage(
			bot,
			channelId,
			getSuggestionPrompt(bot, guild, author, suggestion),
		).then((message) => message.id);
		suggestionByMessageId.delete(id);
		authorIdByMessageId.delete(id);
		suggestionByMessageId.set(newMessageId, suggestion);
		authorIdByMessageId.set(newMessageId, authorId);

		const suggestionReferenceId = stringifyValue(suggestion.ref);

		messageIdBySuggestionReferenceId.delete(suggestionReferenceId);
		messageIdBySuggestionReferenceId.set(suggestionReferenceId, newMessageId);
	});

	// Anti-tampering feature; detects embeds being deleted from suggestion prompts.
	extendEventHandler(bot, 'messageUpdate', { prepend: true }, (bot, { id, channelId, guildId, embeds }) => {
		// If the message was updated in any other channel apart from a suggestion channel.
		if (suggestionChannelIdByGuildId.get(guildId!) !== channelId) {
			return;
		}

		// If the embed is still present, it wasn't an embed having been deleted. Do not do anything.
		if (embeds.length === 1) return;

		// Delete the message and allow the bot to handle the deletion.
		deleteMessage(bot, channelId, id);
	});
}

function registerSuggestionHandler(
	client: Client,
	guildId: bigint,
	channelId: bigint,
	[authorId, authorReference]: [bigint, Reference],
	suggestionReferenceId: string,
): void {
	suggestionPromptHandlers.set(`${authorId}|${guildId}|${suggestionReferenceId}`, async (bot, selection) => {
		const isClose = selection.data!.customId!.split('|')[4]! === 'true';

		const suggestions = client.database.adapters.suggestions.get(client, 'authorAndGuild', [
			authorReference,
			guildId.toString(),
		]);
		if (suggestions === undefined) return;

		const suggestion = suggestions.get(suggestionReferenceId.toString());
		if (suggestion === undefined) return;

		if (isClose && suggestion.data.isResolved) {
			return void sendInteractionResponse(bot, selection.id, selection.token, {
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Services.alreadyMarkedAsResolved, defaultLocale),
						color: constants.colors.dullYellow,
					}],
				},
			});
		}

		if (!isClose && !suggestion.data.isResolved) {
			return void sendInteractionResponse(bot, selection.id, selection.token, {
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Services.alreadyMarkedAsUnresolved, defaultLocale),
						color: constants.colors.dullYellow,
					}],
				},
			});
		}

		const updatedSuggestionContent = lodash.cloneDeep(suggestion) as Document<Suggestion>;

		updatedSuggestionContent.data.isResolved = isClose;

		const updatedSuggestionDocument = await client.database.adapters.suggestions.update(
			client,
			updatedSuggestionContent,
		);
		if (updatedSuggestionDocument === undefined) return;

		const messageId = messageIdBySuggestionReferenceId.get(suggestionReferenceId);
		if (messageId === undefined) return;

		suggestionByMessageId.set(messageId, updatedSuggestionDocument);

		deleteMessage(bot, channelId, messageId);

		return;
	});
}

function getSuggestionPrompt(
	bot: Bot,
	guild: WithLanguage<Guild>,
	author: DiscordUser,
	suggestionDocument: Document<Suggestion>,
): CreateMessage {
	const suggestionReferenceId = stringifyValue(suggestionDocument.ref);

	return {
		embeds: [{
			title: diagnosticMentionUser(author),
			color: constants.colors.green,
			thumbnail: (() => {
				const iconURL = getAvatarURL(bot, author.id, author.discriminator, {
					avatar: author.avatar,
					size: 32,
					format: 'webp',
				});
				if (iconURL === undefined) return;

				return { url: iconURL };
			})(),
			fields: [
				{
					name: localise(Services.submittedBy, defaultLocale),
					value: mention(author.id, MentionTypes.User),
				},
				{
					name: localise(Services.submittedAt, defaultLocale),
					value: timestamp(suggestionDocument.data.createdAt),
				},
				{
					name: localise(Services.suggestions.suggestion, defaultLocale),
					value: suggestionDocument.data.suggestion,
				},
			],
			footer: { text: `${author.id}${constants.symbols.meta.metadataSeparator}${suggestionReferenceId}` },
		}],
		components: [{
			type: MessageComponentTypes.ActionRow,
			components: [
				!suggestionDocument.data.isResolved
					? {
						type: MessageComponentTypes.Button,
						style: ButtonStyles.Primary,
						label: localise(Services.markAsResolved, defaultLocale),
						customId:
							`${constants.staticComponentIds.suggestions}|${author.id}|${guild.id}|${suggestionReferenceId}|true`,
					}
					: {
						type: MessageComponentTypes.Button,
						style: ButtonStyles.Secondary,
						label: localise(Services.markAsUnresolved, defaultLocale),
						customId:
							`${constants.staticComponentIds.suggestions}|${author.id}|${guild.id}|${suggestionReferenceId}|false`,
					},
			],
		}],
	};
}

export default service;
export {
	authorIdByMessageId,
	getSuggestionPrompt,
	messageIdBySuggestionReferenceId,
	registerSuggestionHandler,
	suggestionByMessageId,
};
