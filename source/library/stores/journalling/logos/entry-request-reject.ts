import type { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"entryRequestReject"> = (client, [user, author], { guildLocale }) => {
	const strings = constants.contexts.entryRequestReject({
		localise: client.localise.bind(client),
		locale: guildLocale,
	});
	return {
		embeds: [
			{
				title: `${constants.emojis.events.entryRequest.rejected} ${strings.title}`,
				colour: constants.colours.failure,
				description: strings.description({
					user: client.diagnostics.user(user),
					moderator: client.diagnostics.member(author),
				}),
			},
		],
	};
};

export default logger;
