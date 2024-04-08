import { EventLogger } from "logos/stores/journalling/loggers";

const logger: EventLogger<"reportSubmit"> = async (client, author, report) => {
	const messageLink = report.formData.messageLink ?? "*No message link*.";

	return {
		embeds: [
			{
				title: `${constants.emojis.events.report} Report submitted`,
				color: constants.colours.failure,
				description: `${client.diagnostics.member(author)} has submitted a report.

**REASON**
${report.formData.reason}

**REPORTED USERS**
${report.formData.users}

**MESSAGE LINK**
${messageLink}`,
			},
		],
	};
};

export default logger;
