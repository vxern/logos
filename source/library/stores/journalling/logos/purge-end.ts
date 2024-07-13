import { mention } from "logos:core/formatting";
import type { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"purgeEnd"> = (client, [member, channel, messageCount, author], { guildLocale }) => {
	const strings = constants.contexts.purgeEnd({ localise: client.localise, locale: guildLocale });
	return {
		embeds: [
			{
				title: `${constants.emojis.events.purging.end} ${strings.title}`,
				color: constants.colours.success,
				description: strings.description({
					moderator: client.diagnostics.member(member),
					message_count: client.pluralise("events.purgeBegin.description.messages", guildLocale, {
						quantity: messageCount,
					}),
					channel: mention(channel.id, { type: "channel" }),
				}),
				fields:
					author !== undefined
						? [
								{
									name: strings.fields.author,
									value: client.diagnostics.user(author),
								},
							]
						: undefined,
			},
		],
	};
};

export default logger;
