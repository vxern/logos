import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"inquiryOpen"> = async (client, [member, ticket], { guildLocale }) => {
	const strings = constants.contexts.inquiryOpen({ localise: client.localise, locale: guildLocale });
	return {
		embeds: [
			{
				title: `${constants.emojis.events.ticket} ${strings.title}`,
				color: constants.colours.notice,
				description: strings.description({ user: client.diagnostics.member(member) }),
				fields: [
					{
						name: strings.fields.topic,
						value: ticket.formData.topic,
					},
				],
			},
		],
	};
};

export default logger;
