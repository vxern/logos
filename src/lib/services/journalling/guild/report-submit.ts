import diagnostics from "../../../../diagnostics";
import { Client } from "../../../client";
import { Report } from "../../../database/report";
import { EventLogger } from "../logger";

class ReportSubmitEventLogger extends EventLogger<"reportSubmit"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.symbols.events.report} Report submitted`,
			colour: constants.colors.darkRed,
		});
	}

	filter(originGuildId: bigint, author: Logos.Member, _: Report): boolean {
		return originGuildId === author.guildId;
	}

	message(author: Logos.Member, report: Report): string | undefined {
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
