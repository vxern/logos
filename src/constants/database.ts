const collections = Object.freeze([
	"EntryRequests",
	"GuildStats",
	"Guilds",
	"Praises",
	"Reports",
	"Resources",
	"Suggestions",
	"Tickets",
	"Users",
	"Warnings",
] as const satisfies readonly string[]);
type Collection = (typeof collections)[number];

function isValidCollection(collection: string): collection is Collection {
	return (collections as unknown as string[]).includes(collection);
}

/**
 * @privateRemarks
 * ! These are ordered by their position in document IDs. Changing the order could cause severe breakage and possibly even data loss.
 * ! Do not change the order unless you know what you are doing and have a good reason to.
 */
const identifierParts = Object.freeze([
	"guildId",
	"userId",
	"authorId",
	"targetId",
	"channelId",
	"createdAt",
] satisfies string[]);

export default Object.freeze({ collections, identifierParts } as const);
export { isValidCollection };
export type { Collection };