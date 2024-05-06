import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"memberWarnRemove"> = async (client, [member, warning, author], { guildLocale }) => {
	const strings = constants.contexts.memberWarnRemove({ localise: client.localise.bind(client), locale: guildLocale });
	return {
		embeds: [
			{
				title: `${constants.emojis.events.pardoned} ${strings.title}`,
				color: constants.colours.success,
				description: strings.description({
					user: client.diagnostics.member(member),
					moderator: client.diagnostics.user(author),
				}),
				fields: [
					{
						name: strings.fields.warning,
						value: warning.reason,
					},
				],
			},
		],
	};
};

export default logger;
