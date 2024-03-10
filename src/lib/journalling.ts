import diagnostics from "../diagnostics";
import { Client } from "./client";
import { Collector } from "./collectors";
import { GuildBanAddEventLogger } from "./journalling/discord/guild-ban-add";
import { GuildBanRemoveEventLogger } from "./journalling/discord/guild-ban-remove";
import { GuildMemberAddEventLogger } from "./journalling/discord/guild-member-add";
import { GuildMemberRemoveEventLogger } from "./journalling/discord/guild-member-remove";
import { MessageDeleteEventLogger } from "./journalling/discord/message-delete";
import { MessageUpdateEventLogger } from "./journalling/discord/message-update";
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
	readonly #discord: {
		readonly guildBanAdd: GuildBanAddEventLogger;
		readonly guildBanRemove: GuildBanRemoveEventLogger;
		readonly guildMemberAdd: GuildMemberAddEventLogger;
		readonly guildMemberRemove: GuildMemberRemoveEventLogger;
		readonly messageDelete: MessageDeleteEventLogger;
		readonly messageUpdate: MessageUpdateEventLogger;
	};
	readonly #logos: {
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

	readonly #log: Logger;
	readonly #client: Client;

	readonly #_guildBanAddCollector: Collector<"guildBanAdd">;
	readonly #_guildBanRemoveCollector: Collector<"guildBanRemove">;
	readonly #_guildMemberAddCollector: Collector<"guildMemberAdd">;
	readonly #_guildMemberRemoveCollector: Collector<"guildMemberRemove">;
	readonly #_messageDeleteCollector: Collector<"messageDelete">;
	readonly #_messageUpdateCollector: Collector<"messageUpdate">;

	constructor(client: Client) {
		this.#discord = {
			guildBanAdd: new GuildBanAddEventLogger(client),
			guildBanRemove: new GuildBanRemoveEventLogger(client),
			guildMemberAdd: new GuildMemberAddEventLogger(client),
			guildMemberRemove: new GuildMemberRemoveEventLogger(client),
			messageDelete: new MessageDeleteEventLogger(client),
			messageUpdate: new MessageUpdateEventLogger(client),
		};
		this.#logos = {
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

		this.#log = Logger.create({ identifier: "JournallingStore", isDebug: client.environment.isDebug });
		this.#client = client;

		this.#_guildBanAddCollector = new Collector();
		this.#_guildBanRemoveCollector = new Collector();
		this.#_guildMemberAddCollector = new Collector();
		this.#_guildMemberRemoveCollector = new Collector();
		this.#_messageDeleteCollector = new Collector();
		this.#_messageUpdateCollector = new Collector();
	}

	async start(): Promise<void> {
		this.#_guildBanAddCollector.onCollect((user, guildId) =>
			this.tryLog("guildBanAdd", { guildId, args: [user, guildId] }),
		);
		this.#_guildBanRemoveCollector.onCollect((user, guildId) =>
			this.tryLog("guildBanRemove", { guildId, args: [user, guildId] }),
		);
		this.#_guildMemberAddCollector.onCollect((member, user) =>
			this.tryLog("guildMemberAdd", { guildId: member.guildId, args: [member, user] }),
		);
		this.#_guildMemberRemoveCollector.onCollect((user, guildId) =>
			this.tryLog("guildMemberRemove", { guildId, args: [user, guildId] }),
		);
		this.#_messageDeleteCollector.onCollect((payload, message) => {
			const guildId = payload.guildId;
			if (guildId === undefined) {
				return;
			}

			this.tryLog("messageDelete", { guildId, args: [payload, message] });
		});
		this.#_messageUpdateCollector.onCollect((message, oldMessage) => {
			const guildId = message.guildId;
			if (guildId === undefined) {
				return;
			}

			this.tryLog("messageUpdate", { guildId, args: [message, oldMessage] });
		});

		await this.#client.registerCollector("guildBanAdd", this.#_guildBanAddCollector);
		await this.#client.registerCollector("guildBanRemove", this.#_guildBanRemoveCollector);
		await this.#client.registerCollector("guildMemberAdd", this.#_guildMemberAddCollector);
		await this.#client.registerCollector("guildMemberRemove", this.#_guildMemberRemoveCollector);
		await this.#client.registerCollector("messageDelete", this.#_messageDeleteCollector);
		await this.#client.registerCollector("messageUpdate", this.#_messageUpdateCollector);
	}

	stop(): void {
		this.#_guildBanAddCollector.close();
		this.#_guildBanRemoveCollector.close();
		this.#_guildMemberAddCollector.close();
		this.#_guildMemberRemoveCollector.close();
		this.#_messageDeleteCollector.close();
		this.#_messageUpdateCollector.close();
	}

	async tryLog<Event extends keyof Events>(
		event: Event,
		{ guildId, journalling, args }: { guildId: bigint; journalling?: boolean; args: Events[Event] },
	): Promise<void> {
		// If explicitly defined as false, do not log.
		if (journalling === false) {
			this.#client.log.info(
				`Event '${event}' happened on ${diagnostics.display.guild(
					guildId,
				)}, but journalling for that feature is explicitly turned off. Ignoring...`,
			);
			return;
		}

		const guildDocument = this.#client.documents.guilds.get(guildId.toString());
		if (guildDocument === undefined) {
			return;
		}

		const configuration = guildDocument.journalling;
		if (configuration === undefined) {
			return;
		}

		const channelId = BigInt(configuration.channelId);
		if (channelId === undefined) {
			return;
		}

		// @ts-ignore: This is fine.
		const logger = this.#discord[event] ?? this.#logos[event];
		if (logger === undefined) {
			return;
		}

		// @ts-ignore: This is fine.
		if (!this.filter(guildId, ...args)) {
			return;
		}

		// @ts-ignore: This is fine.
		const contents = await this.message(...args);
		if (contents === undefined) {
			return;
		}

		await this.#client.bot.rest
			.sendMessage(channelId, {
				embeds: [
					{
						title: logger.title,
						description: contents,
						color: logger.colour,
					},
				],
			})
			.catch(() => this.#log.warn(`Failed to log '${event}' event on ${diagnostics.display.guild(guildId)}.`));
	}
}

export { JournallingStore };
