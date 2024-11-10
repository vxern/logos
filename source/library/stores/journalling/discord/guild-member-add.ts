import type { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"guildMemberAdd"> = (client, [_, user], { guildLocale }) => {
	const strings = constants.contexts.guildMemberAdd({ localise: client.localise, locale: guildLocale });
	return {
		embeds: [
			{
				title: `${constants.emojis.events.user.joined} ${strings.title}`,
				color: constants.colours.success,
				description: strings.description({ user: client.diagnostics.user(user) }),
			},
		],
	};
};

export default logger;
