import type { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"memberTimeoutRemove"> = (client, [member, author], { guildLocale }) => {
	const strings = constants.contexts.memberTimeoutRemove({
		localise: client.localise.bind(client),
		locale: guildLocale,
	});
	return {
		embeds: [
			{
				title: `${constants.emojis.events.timeout.removed} ${strings.title}`,
				color: constants.colours.notice,
				description: strings.description({
					user: client.diagnostics.member(member),
					moderator: client.diagnostics.user(author),
				}),
			},
		],
	};
};

export default logger;