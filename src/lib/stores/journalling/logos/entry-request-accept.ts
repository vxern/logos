import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"entryRequestAccept"> = async (client, [user, author], { guildLocale }) => {
	const strings = constants.contexts.entryRequestAccept({
		localise: client.localise.bind(client),
		locale: guildLocale,
	});
	return {
		embeds: [
			{
				title: `${constants.emojis.events.entryRequest.accepted} ${strings.title}`,
				colour: constants.colours.success,
				description: strings.description({
					user: client.diagnostics.user(user),
					moderator: client.diagnostics.member(author),
				}),
			},
		],
	};
};

export default logger;
