import constants from "../../../../constants/constants";
import diagnostics from "../../../../diagnostics";
import { GuildEvents, MessageGenerators } from "../generator";

export default {
	title: `${constants.symbols.events.report} Report submitted`,
	message: (client, author, report) => {
		const authorUser = client.entities.users.get(author.id);
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
	},
	filter: (_, originGuildId, author, __) => originGuildId === author.guildId,
	color: constants.colors.darkRed,
} satisfies MessageGenerators<GuildEvents>["reportSubmit"];
