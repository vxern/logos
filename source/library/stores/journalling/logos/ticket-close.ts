import type { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"ticketClose"> = (client, [member, ticket, author, messageLog], { guildLocale }) => {
	const strings = constants.contexts.ticketClose({ localise: client.localise.bind(client), locale: guildLocale });
	return {
		embeds: [
			{
				title: `${constants.emojis.events.ticket} ${strings.title}`,
				color: constants.colours.yellow,
				description: strings.description({
					user: client.diagnostics.member(member),
					moderator: client.diagnostics.user(author),
				}),
				fields: [
					{
						name: strings.fields.topic,
						value: ticket.formData.topic,
					},
				],
			},
		],
		files: [{ name: "log.txt", blob: new Blob([messageLog]) } as Discord.FileContent],
	};
};

export default logger;
