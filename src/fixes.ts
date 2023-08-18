import * as Discord from "@discordeno/bot";

/**
 * TODO(vxern): This is a Discordeno fix. Remove it later.
 */
function handleGuildMembersChunk(bot: Discord.Bot, data: Discord.DiscordGatewayPayload, _: number) {
	const payload = data.d as Discord.DiscordGuildMembersChunk;

	const guildId = bot.transformers.snowflake(payload.guild_id);

	if (payload.nonce !== undefined && payload.chunk_index >= payload.chunk_count - 1) {
		const guildMemberRequest = bot.gateway.cache.requestMembers?.pending?.get(payload.nonce);
		if (guildMemberRequest !== undefined) {
			guildMemberRequest.resolve(guildMemberRequest.members);
		}
	}

	return {
		guildId,
		members: payload.members.map((m) =>
			bot.transformers.member(bot, m, guildId, bot.transformers.snowflake(m.user.id)),
		),
		chunkIndex: payload.chunk_index,
		chunkCount: payload.chunk_count,
		notFound: payload.not_found?.map((id) => bot.transformers.snowflake(id)),
		presences: payload.presences?.map((presence) => ({
			user: bot.transformers.user(bot, presence.user),
			guildId,
			status: Discord.PresenceStatus[presence.status],
			activities: presence.activities.map((activity) => bot.transformers.activity(bot, activity)),
			clientStatus: {
				desktop: presence.client_status.desktop,
				mobile: presence.client_status.mobile,
				web: presence.client_status.web,
			},
		})),
		nonce: payload.nonce,
	};
}

/**
 * TODO(vxern): This is a Discordeno fix. Remove it later.
 */
type DesiredPropertyObject = Record<string, boolean | Record<string, unknown>>;
function enableDesiredProperties(object: DesiredPropertyObject): DesiredPropertyObject {
	for (const [key, value] of Object.entries(object)) {
		if (typeof value !== "boolean") {
			object[key] = enableDesiredProperties(value as typeof object);
			continue;
		}

		object[key] = true;
	}
	return object;
}

/**
 * TODO(vxern): This is a Discordeno fix. Remove it later.
 *
 * It was originally added here to deal with message updates occurring when link embeds
 * loaded.
 */
function overrideDefaultEventHandlers(bot: Discord.Bot): Discord.Bot {
	bot.handlers.MESSAGE_UPDATE = (bot, data) => {
		const messageData = data.d as Discord.DiscordMessage;
		if (!("author" in messageData)) {
			return;
		}

		bot.events.messageUpdate?.(bot.transformers.message(bot, messageData));
	};

	return bot;
}

export { overrideDefaultEventHandlers, enableDesiredProperties, handleGuildMembersChunk };
