import type { FeatureLanguage, Locale } from "logos:constants/languages";
import type * as Discord from "@discordeno/bot";
import type { Client } from "logos/client";
import guildBanAdd from "logos/stores/journalling/discord/guild-ban-add";
import guildBanRemove from "logos/stores/journalling/discord/guild-ban-remove";
import guildMemberAdd from "logos/stores/journalling/discord/guild-member-add";
import guildMemberRemove from "logos/stores/journalling/discord/guild-member-remove";
import messageDelete from "logos/stores/journalling/discord/message-delete";
import messageUpdate from "logos/stores/journalling/discord/message-update";
import guildMemberKick from "logos/stores/journalling/logos/guild-member-kick";
import entryRequestAccept from "logos/stores/journalling/logos/entry-request-accept";
import entryRequestReject from "logos/stores/journalling/logos/entry-request-reject";
import entryRequestSubmit from "logos/stores/journalling/logos/entry-request-submit";
import inquiryOpen from "logos/stores/journalling/logos/inquiry-open";
import memberTimeoutAdd from "logos/stores/journalling/logos/member-timeout-add";
import memberTimeoutRemove from "logos/stores/journalling/logos/member-timeout-remove";
import memberWarnAdd from "logos/stores/journalling/logos/member-warn-add";
import memberWarnRemove from "logos/stores/journalling/logos/member-warn-remove";
import praiseAdd from "logos/stores/journalling/logos/praise-add";
import purgeBegin from "logos/stores/journalling/logos/purge-begin";
import purgeEnd from "logos/stores/journalling/logos/purge-end";
import reportSubmit from "logos/stores/journalling/logos/report-submit";
import resourceSend from "logos/stores/journalling/logos/resource-send";
import slowmodeDisable from "logos/stores/journalling/logos/slowmode-disable";
import slowmodeDowngrade from "logos/stores/journalling/logos/slowmode-downgrade";
import slowmodeEnable from "logos/stores/journalling/logos/slowmode-enable";
import slowmodeUpgrade from "logos/stores/journalling/logos/slowmode-upgrade";
import suggestionSend from "logos/stores/journalling/logos/suggestion-send";
import ticketOpen from "logos/stores/journalling/logos/ticket-open";

type Events = Logos.Events & Discord.Events;

const loggers = Object.freeze({
	guildBanAdd,
	guildBanRemove,
	guildMemberAdd,
	guildMemberRemove,
	messageDelete,
	messageUpdate,
	guildMemberKick,
	entryRequestSubmit,
	entryRequestAccept,
	entryRequestReject,
	memberWarnAdd,
	memberWarnRemove,
	memberTimeoutAdd,
	memberTimeoutRemove,
	praiseAdd,
	reportSubmit,
	resourceSend,
	suggestionSend,
	ticketOpen,
	inquiryOpen,
	purgeBegin,
	purgeEnd,
	slowmodeEnable,
	slowmodeDisable,
	slowmodeUpgrade,
	slowmodeDowngrade,
} as const satisfies EventLoggers);

type EventLoggers = { [Event in keyof Events]?: EventLogger<Event> };
type EventLogger<Event extends keyof Events> = (
	client: Client,
	event: Events[Event],
	{ guildLocale, featureLanguage }: { guildLocale: Locale; featureLanguage: FeatureLanguage },
) => Discord.CreateMessageOptions | Promise<Discord.CreateMessageOptions | undefined> | undefined;

export default loggers;
export type { EventLogger };
