import { Client } from "logos/client";
import { Report } from "logos/database/report";
import { EventLogger } from "logos/stores/journalling/logger";

class ReportSubmitEventLogger extends EventLogger<"reportSubmit"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.report} Report submitted`,
			colour: constants.colours.darkRed,
		});
	}

	buildMessage(author: Logos.Member, report: Report): string | undefined {
		const authorUser = this.client.entities.users.get(author.id);
		if (authorUser === undefined) {
			return;
		}

		const messageLink = report.formData.messageLink ?? "*No message link*.";

		return `${this.client.diagnostics.user(authorUser)} has submitted a report.

**REASON**
${report.formData.reason}

**REPORTED USERS**
${report.formData.users}

**MESSAGE LINK**
${messageLink}`;
	}
}

export { ReportSubmitEventLogger };
