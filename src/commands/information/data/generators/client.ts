import { EventHandlers } from '../../../../../deps.ts';
import configuration from '../../../../configuration.ts';
import {
	codeMultiline,
	mention,
	MentionTypes,
} from '../../../../formatting.ts';
import { mentionUser } from '../../../../utils.ts';
import { MessageGenerators } from './generators.ts';

type ClientEvents = {
	[T in keyof EventHandlers]: Parameters<EventHandlers[T]>;
};

/** Stores the message generators for client events. */
const client: MessageGenerators<ClientEvents> = {
	guildBanAdd: {
		title: '⚔️ User banned',
		message: (_client, _bot, user, _guildId) =>
			`${mentionUser(user)} has been banned.`,
		filter: (_client, originGuildId, _bot, user, guildId) =>
			originGuildId === guildId && !user.toggles.bot,
		color: configuration.interactions.responses.colors.red,
	},
	guildBanRemove: {
		title: '😇 User unbanned',
		message: (_client, _bot, user, _guildId) =>
			`${mentionUser(user)} has been unbanned.`,
		filter: (_client, originGuildId, _bot, user, guildId) =>
			originGuildId === guildId && !user.toggles.bot,
		color: configuration.interactions.responses.colors.yellow,
	},
	guildMemberAdd: {
		title: '😁 User joined',
		message: (_client, _bot, _member, user) =>
			`${mentionUser(user)} has joined the server.`,
		filter: (_client, originGuildId, _bot, member, user) =>
			originGuildId === member.guildId && !user.toggles.bot,
		color: configuration.interactions.responses.colors.green,
	},
	guildMemberRemove: {
		title: '😔 User kicked or left',
		message: (_client, _bot, user, _guildId) =>
			`${mentionUser(user)} has left the server, or they have been kicked.`,
		filter: (_client, originGuildId, _bot, user, guildId) =>
			originGuildId === guildId && !user.toggles.bot,
		color: configuration.interactions.responses.colors.yellow,
	},
	messageUpdate: {
		title: '⬆️ Message updated',
		message: (client, _bot, message, oldMessage) => {
			const author = client.users.get(message.authorId);
			if (!author) return;

			return `${mentionUser(author)} updated their message in ${
				mention(message.channelId, MentionTypes.Channel)
			}.

**BEFORE**
${oldMessage ? codeMultiline(oldMessage.content) : '*No message*'}
**AFTER**
${codeMultiline(message.content)}`;
		},
		filter: (client, originGuildId, _bot, message, oldMessage) => {
			const author = client.users.get(message.authorId);
			if (!author) return false;

			return originGuildId === message.guildId && !author.toggles.bot &&
				message.content !== oldMessage?.content;
		},
		color: configuration.interactions.responses.colors.blue,
	},
	messageDelete: {
		title: '❌ Message deleted',
		message: (client, _bot, _payload, message) => {
			if (!message) return;

			const author = client.users.get(message.authorId);
			if (!author) return;

			return `${mentionUser(author)} deleted their message in ${
				mention(message.channelId, MentionTypes.Channel)
			}.

**CONTENT**
${codeMultiline(message.content)}`;
		},
		filter: (client, originGuildId, _bot, payload, message) => {
			if (!message) return false;

			const author = client.users.get(message.authorId);
			if (!author) return false;

			return (message
				? originGuildId === message.guildId
				: originGuildId === payload.guildId) && !author.toggles.bot;
		},
		color: configuration.interactions.responses.colors.red,
	},
};

export default client;
export type { ClientEvents };
