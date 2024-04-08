import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"praiseAdd"> = async (client, member, praise, author) => {
	const comment = praise.comment ?? "None.";

	return {
		embeds: [
			{
				title: `${constants.emojis.events.praised} Member praised`,
				color: constants.colours.success,
				description: `${client.diagnostics.member(member)} has been praised by ${client.diagnostics.user(
					author,
				)}. Comment: ${comment}`,
			},
		],
	};
};

export default logger;
