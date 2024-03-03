import diagnostics from "../diagnostics";
import { Client } from "./client";
import { GuildBanAddEventLogger } from "./journalling/discord/guild-ban-add";
import { GuildBanRemoveEventLogger } from "./journalling/discord/guild-ban-remove";
import { GuildMemberAddEventLogger } from "./journalling/discord/guild-member-add";
import { GuildMemberRemoveEventLogger } from "./journalling/discord/guild-member-remove";
import { MessageDeleteEventLogger } from "./journalling/discord/message-delete";
import { MessageUpdateEventLogger } from "./journalling/discord/message-update";
import { Events } from "./journalling/logger";
import { EntryRequestAcceptEventLogger } from "./journalling/logos/entry-request-accept";
import { EntryRequestRejectEventLogger } from "./journalling/logos/entry-request-reject";
import { EntryRequestSubmitEventLogger } from "./journalling/logos/entry-request-submit";
import { InquiryOpenEventLogger } from "./journalling/logos/inquiry-open";
import { MemberTimeoutAddEventLogger } from "./journalling/logos/member-timeout-add";
import { MemberTimeoutRemoveEventLogger } from "./journalling/logos/member-timeout-remove";
import { MemberWarnAddEventLogger } from "./journalling/logos/member-warn-add";
import { MemberWarnRemoveEventLogger } from "./journalling/logos/member-warn-remove";
import { PraiseAddEventLogger } from "./journalling/logos/praise-add";
import { PurgeBeginEventLogger } from "./journalling/logos/purge-begin";
import { PurgeEndEventLogger } from "./journalling/logos/purge-end";
import { ReportSubmitEventLogger } from "./journalling/logos/report-submit";
import { ResourceSendEventLogger } from "./journalling/logos/resource-send";
import { SlowmodeDisableEventLogger } from "./journalling/logos/slowmode-disable";
import { SlowmodeDowngradeEventLogger } from "./journalling/logos/slowmode-downgrade";
import { SlowmodeEnableEventLogger } from "./journalling/logos/slowmode-enable";
import { SlowmodeUpgradeEventLogger } from "./journalling/logos/slowmode-upgrade";
import { SuggestionSendEventLogger } from "./journalling/logos/suggestion-send";
import { TicketOpenEventLogger } from "./journalling/logos/ticket-open";
import { Logger } from "./logger";

class JournallingStore {
	readonly discord: {
		readonly guildBanAdd: GuildBanAddEventLogger;
		readonly guildBanRemove: GuildBanRemoveEventLogger;
		readonly guildMemberAdd: GuildMemberAddEventLogger;
		readonly guildMemberRemove: GuildMemberRemoveEventLogger;
		readonly messageDelete: MessageDeleteEventLogger;
		readonly messageUpdate: MessageUpdateEventLogger;
	};
	readonly logos: {
		readonly entryRequestSubmit: EntryRequestSubmitEventLogger;
		readonly entryRequestAccept: EntryRequestAcceptEventLogger;
		readonly entryRequestReject: EntryRequestRejectEventLogger;
		readonly memberWarnAdd: MemberWarnAddEventLogger;
		readonly memberWarnRemove: MemberWarnRemoveEventLogger;
		readonly memberTimeoutAdd: MemberTimeoutAddEventLogger;
		readonly memberTimeoutRemove: MemberTimeoutRemoveEventLogger;
		readonly praiseAdd: PraiseAddEventLogger;
		readonly reportSubmit: ReportSubmitEventLogger;
		readonly resourceSend: ResourceSendEventLogger;
		readonly suggestionSend: SuggestionSendEventLogger;
		readonly ticketOpen: TicketOpenEventLogger;
		readonly inquiryOpen: InquiryOpenEventLogger;
		readonly purgeBegin: PurgeBeginEventLogger;
		readonly purgeEnd: PurgeEndEventLogger;
		readonly slowmodeEnable: SlowmodeEnableEventLogger;
		readonly slowmodeDisable: SlowmodeDisableEventLogger;
		readonly slowmodeUpgrade: SlowmodeUpgradeEventLogger;
		readonly slowmodeDowngrade: SlowmodeDowngradeEventLogger;
	};

	readonly #client: Client;
	readonly #log: Logger;

	constructor(client: Client, { isDebug }: { isDebug?: boolean }) {
		this.discord = {
			guildBanAdd: new GuildBanAddEventLogger(client),
			guildBanRemove: new GuildBanRemoveEventLogger(client),
			guildMemberAdd: new GuildMemberAddEventLogger(client),
			guildMemberRemove: new GuildMemberRemoveEventLogger(client),
			messageDelete: new MessageDeleteEventLogger(client),
			messageUpdate: new MessageUpdateEventLogger(client),
		};
		this.logos = {
			entryRequestSubmit: new EntryRequestSubmitEventLogger(client),
			entryRequestAccept: new EntryRequestAcceptEventLogger(client),
			entryRequestReject: new EntryRequestRejectEventLogger(client),
			memberWarnAdd: new MemberWarnAddEventLogger(client),
			memberWarnRemove: new MemberWarnRemoveEventLogger(client),
			memberTimeoutAdd: new MemberTimeoutAddEventLogger(client),
			memberTimeoutRemove: new MemberTimeoutRemoveEventLogger(client),
			praiseAdd: new PraiseAddEventLogger(client),
			reportSubmit: new ReportSubmitEventLogger(client),
			resourceSend: new ResourceSendEventLogger(client),
			suggestionSend: new SuggestionSendEventLogger(client),
			ticketOpen: new TicketOpenEventLogger(client),
			inquiryOpen: new InquiryOpenEventLogger(client),
			purgeBegin: new PurgeBeginEventLogger(client),
			purgeEnd: new PurgeEndEventLogger(client),
			slowmodeEnable: new SlowmodeEnableEventLogger(client),
			slowmodeDisable: new SlowmodeDisableEventLogger(client),
			slowmodeUpgrade: new SlowmodeUpgradeEventLogger(client),
			slowmodeDowngrade: new SlowmodeDowngradeEventLogger(client),
		};

		this.#client = client;
		this.#log = Logger.create({ identifier: "JournallingStore", isDebug });
	}

	async tryLog<Event extends keyof Logos.Events>(event: Event, { args }: { args: Logos.Events[Event] }): Promise<void> {
		const logger = this.logos[event];
		if (logger === undefined) {
			return;
		}

		const channelId = this.channelId;
		if (channelId === undefined) {
			return;
		}

		if (!journalEntryGenerator.filter(this.guildId, ...args)) {
			return;
		}

		const journalEntry = await journalEntryGenerator.message(...args);
		if (journalEntry === undefined) {
			return;
		}

		await this.#client.bot.rest
			.sendMessage(channelId, {
				embeds: [
					{
						title: journalEntryGenerator.title,
						description: journalEntry,
						color: journalEntryGenerator.color,
					},
				],
			})
			.catch(() => this.#log.warn(`Failed to log '${event}' event on ${diagnostics.display.guild(this.guildId)}.`));
	}
}

export { JournallingStore };
