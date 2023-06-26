import { EventHandlers } from 'discordeno';
import { MessageGenerators } from 'logos/src/lib/controllers/logging/generators/generators.ts';
import { diagnosticMentionUser } from 'logos/src/lib/utils.ts';
import constants from 'logos/src/constants.ts';
import { codeMultiline, mention, MentionTypes } from 'logos/src/formatting.ts';

type ClientEvents = {
	[T in keyof EventHandlers]: Parameters<EventHandlers[T]>;
};

/** Stores the message generators for client events. */
const client: MessageGenerators<ClientEvents> = {
	guildBanAdd: {
		title: `${constants.symbols.events.user.banned} User banned`,
		message: (_, __, user, ___) => `${diagnosticMentionUser(user)} has been banned.`,
		filter: (_, originGuildId, __, user, guildId) => originGuildId === guildId && !user.toggles.bot,
		color: constants.colors.red,
	},
	guildBanRemove: {
		title: `${constants.symbols.events.user.unbanned} User unbanned`,
		message: (_, __, user, ___) => `${diagnosticMentionUser(user)} has been unbanned.`,
		filter: (_, originGuildId, __, user, guildId) => originGuildId === guildId && !user.toggles.bot,
		color: constants.colors.dullYellow,
	},
	guildMemberAdd: {
		title: `${constants.symbols.events.user.joined} User joined`,
		message: (_, __, ___, user) => `${diagnosticMentionUser(user)} has joined the server.`,
		filter: (_, originGuildId, __, member, user) => originGuildId === member.guildId && !user.toggles.bot,
		color: constants.colors.lightGreen,
	},
	guildMemberRemove: {
		title: `${constants.symbols.events.user.left} User left`,
		message: (_, __, user, ___) => `${diagnosticMentionUser(user)} has left the server.`,
		filter: (_, originGuildId, __, user, guildId) => originGuildId === guildId && !user.toggles.bot,
		color: constants.colors.dullYellow,
	},
	messageUpdate: {
		title: `${constants.symbols.events.message.updated} Message updated`,
		message: (client, _, message, __) => {
			const oldMessage = client.cache.messages.previous.get(message.id);
			if (oldMessage === undefined) return;

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
		filter: (client, originGuildId, _, message, oldMessage) => {
			const author = client.cache.users.get(message.authorId);
			if (author === undefined) return false;

			return originGuildId === message.guildId && !author.toggles.bot &&
				message.content !== oldMessage?.content;
		},
		color: constants.colors.blue,
	},
	messageDelete: {
		title: `${constants.symbols.events.message.deleted} Message deleted`,
		message: (client, _, payload, __) => {
			const message = client.cache.messages.latest.get(payload.id);
			if (message === undefined) return;

			const author = client.cache.users.get(message.authorId);
			if (author === undefined) return;

			return `${diagnosticMentionUser(author)} deleted their message in ${
				mention(message.channelId, MentionTypes.Channel)
			}.

**CONTENT**
${codeMultiline(message.content)}`;
		},
		filter: (client, originGuildId, _, payload, __) => {
			const message = client.cache.messages.latest.get(payload.id);
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
