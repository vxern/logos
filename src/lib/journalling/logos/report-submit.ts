import diagnostics from "logos:core/diagnostics";
import { Client } from "logos/client";
import { Report } from "logos/database/report";
import { EventLogger } from "logos/journalling/logger";

class ReportSubmitEventLogger extends EventLogger<"reportSubmit"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.report} Report submitted`,
			colour: constants.colours.darkRed,
		});
	}

	filter(originGuildId: bigint, author: Logos.Member, _: Report): boolean {
		return originGuildId === author.guildId;
	}

	buildMessage(author: Logos.Member, report: Report): string | undefined {
		const authorUser = this.client.entities.users.get(author.id);
		if (authorUser === undefined) {
			return;
		}

		const messageLink = report.answers.messageLink ?? "*No message link*.";

		return `${diagnostics.display.user(authorUser)} has submitted a report.

**REASON**
${report.answers.reason}

**REPORTED USERS**
${report.answers.users}

**MESSAGE LINK**
${messageLink}`;
	}
}

export { ReportSubmitEventLogger };
