import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"resourceSend"> = async (client, author, resource) => ({
	embeds: [
		{
			title: `${constants.emojis.events.resource} Resource submitted`,
			color: constants.colours.success,
			description: `${client.diagnostics.member(author)} has submitted a resource.\n\nResource: *${
				resource.formData.resource
			}*`,
		},
	],
});

export default logger;
