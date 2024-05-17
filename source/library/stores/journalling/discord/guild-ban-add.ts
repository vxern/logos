import type { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"guildBanAdd"> = (client, [user, _], { guildLocale }) => {
	const strings = constants.contexts.guildBanAdd({ localise: client.localise.bind(client), locale: guildLocale });
	return {
		embeds: [
			{
				title: `${constants.emojis.events.user.banned} ${strings.title}`,
				colour: constants.colours.failure,
				description: strings.description({ user: client.diagnostics.user(user) }),
			},
		],
	};
};

export default logger;
