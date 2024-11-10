import type { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"guildMemberKick"> = (client, [user, author], { guildLocale }) => {
	const strings = constants.contexts.memberKick({
		localise: client.localise.bind(client),
		locale: guildLocale,
	});
	return {
		embeds: [
			{
				title: `${constants.emojis.events.user.kicked} ${strings.title}`,
				color: constants.colours.warning,
				description: strings.description({
					user: client.diagnostics.user(user),
					moderator: client.diagnostics.member(author),
				}),
			},
		],
	};
};

export default logger;
