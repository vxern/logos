import type { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"guildBanRemove"> = (client, [user, _], { guildLocale }) => {
	const strings = constants.contexts.guildBanRemove({ localise: client.localise.bind(client), locale: guildLocale });
	return {
		embeds: [
			{
				title: `${constants.emojis.events.user.unbanned} ${strings.title}`,
				color: constants.colours.success,
				description: strings.description({ user: client.diagnostics.user(user) }),
			},
		],
	};
};

export default logger;
