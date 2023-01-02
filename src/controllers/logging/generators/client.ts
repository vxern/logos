import { EventHandlers } from 'discordeno';
import { MessageGenerators } from 'logos/src/controllers/logging/generators/generators.ts';
import { diagnosticMentionUser } from 'logos/src/utils.ts';
import constants from 'logos/constants.ts';
import { codeMultiline, mention, MentionTypes } from 'logos/formatting.ts';

type ClientEvents = {
	[T in keyof EventHandlers]: Parameters<EventHandlers[T]>;
};

/** Stores the message generators for client events. */
const client: MessageGenerators<ClientEvents> = {
	guildBanAdd: {
		title: '⚔️ User banned',
		message: (_client, _bot, user, _guildId) => `${diagnosticMentionUser(user)} has been banned.`,
		filter: (_client, originGuildId, _bot, user, guildId) => originGuildId === guildId && !user.toggles.bot,
		color: constants.colors.red,
	},
	guildBanRemove: {
		title: '😇 User unbanned',
		message: (_client, _bot, user, _guildId) => `${diagnosticMentionUser(user)} has been unbanned.`,
		filter: (_client, originGuildId, _bot, user, guildId) => originGuildId === guildId && !user.toggles.bot,
		color: constants.colors.dullYellow,
	},
	guildMemberAdd: {
		title: '😁 User joined',
		message: (_client, _bot, _member, user) => `${diagnosticMentionUser(user)} has joined the server.`,
		filter: (_client, originGuildId, _bot, member, user) => originGuildId === member.guildId && !user.toggles.bot,
		color: constants.colors.lightGreen,
	},
	guildMemberRemove: {
		title: '😔 User left',
		message: (_client, _bot, user, _guildId) => `${diagnosticMentionUser(user)} has left the server.`,
		filter: (_client, originGuildId, _bot, user, guildId) => originGuildId === guildId && !user.toggles.bot,
		color: constants.colors.dullYellow,
	},
	messageUpdate: {
		title: '⬆️ Message updated',
		message: (client, _bot, message, oldMessage) => {
			const author = client.cache.users.get(message.authorId);
			if (author === undefined) return;

			const before = oldMessage !== undefined ? codeMultiline(oldMessage.content) : '*No message*';

			return `${diagnosticMentionUser(author)} updated their message in ${
				mention(message.channelId, MentionTypes.Channel)
			}.

**BEFORE**
${before}

**AFTER**
${codeMultiline(message.content)}`;
		},
		filter: (client, originGuildId, _bot, message, oldMessage) => {
			const author = client.cache.users.get(message.authorId);
			if (author === undefined) return false;

			return originGuildId === message.guildId && !author.toggles.bot &&
				message.content !== oldMessage?.content;
		},
		color: constants.colors.blue,
	},
	messageDelete: {
		title: '❌ Message deleted',
		message: (client, _bot, payload, _message) => {
			const message = client.cache.messages.get(payload.id);
			if (message === undefined) return;

			const author = client.cache.users.get(message.authorId);
			if (author === undefined) return;

			return `${diagnosticMentionUser(author)} deleted their message in ${
				mention(message.channelId, MentionTypes.Channel)
			}.

**CONTENT**
${codeMultiline(message.content)}`;
		},
		filter: (client, originGuildId, _bot, payload, _message) => {
			const message = client.cache.messages.get(payload.id);
			if (message === undefined) return false;

			const author = client.cache.users.get(message.authorId);
			if (author === undefined) return false;

			return originGuildId === message.guildId && !author.toggles.bot;
		},
		color: constants.colors.red,
	},
};

export default client;
export type { ClientEvents };
