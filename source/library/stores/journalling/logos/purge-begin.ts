import { mention } from "logos:core/formatting";
import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"purgeBegin"> = async (client, [member, channel, messageCount, author], { guildLocale }) => {
	const strings = constants.contexts.purgeBegin({ localise: client.localise.bind(client), locale: guildLocale });
	return {
		embeds: [
			{
				title: `${constants.emojis.events.purging.begin} ${strings.title}`,
				color: constants.colours.warning,
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
