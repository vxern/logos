import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"guildBanRemove"> = async (client, user, _) => {
	const strings = constants.contexts.banRemove({ localise: client.localise, locale: guildLocale });
	return {
		embeds: [
			{
				title: `${constants.emojis.events.user.unbanned} ${strings.title}`,
				colour: constants.colours.success,
				description: strings.description({ user: client.diagnostics.user(user) }),
			},
		],
	};
};

export default logger;
