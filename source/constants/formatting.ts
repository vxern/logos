type TimestampFormat =
	| "short-time"
	| "long-time"
	| "short-date"
	| "long-date"
	| "short-datetime"
	| "long-datetime"
	| "relative";

const sigilByTimestampFormat = Object.freeze({
	"short-time": "t",
	"long-time": "T",
	"short-date": "d",
	"long-date": "D",
	"short-datetime": "f",
	"long-datetime": "F",
	relative: "R",
} as const satisfies Record<TimestampFormat, string>);

function getSigilByTimestampFormat(format: TimestampFormat): string {
	return sigilByTimestampFormat[format];
}

type MentionType = "channel" | "role" | "user";

const sigilByMentionType = Object.freeze({
	channel: "#",
	role: "@&",
	user: "@",
} as const satisfies Record<MentionType, string>);

function getSigilByMentionType(type: MentionType): string {
	return sigilByMentionType[type];
}

export { getSigilByTimestampFormat, getSigilByMentionType };
export type { TimestampFormat, MentionType };
