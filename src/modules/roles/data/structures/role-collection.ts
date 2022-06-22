import { Member, SelectComponentOption } from '../../../../../deps.ts';
import { Assignable, DescriptionGenerator, Role } from './role.ts';

/** Defines the type of a role collection. */
enum RoleCollectionType {
	/** A role collection whose list of roles is determined through its key (language). */
	COLLECTION_LOCALISED,

	/** A role collection whose list of roles applies to all guilds. */
	COLLECTION,
}

/**
 * Represents a collection of {@link Role}s with an optional description applied
 * to each in case a {@link Role} does not have a description.
 */
interface RoleCollection extends Assignable {
	/** The type of this collection. */
	type: RoleCollectionType;

	/** Description applied to roles in this collection without a description. */
	description?: DescriptionGenerator;

	/** List of roles within this collection. */
	list?: Role[];

	/** Lists of roles with languages as keys. */
	lists?: Record<string, Role[]>;
}

async function createSelectionsFromCollection(
	member: Member,
	language: string | undefined,
	collection: RoleCollection,
): Promise<SelectComponentOption[]> {
	const memberRoles =
		(await getMemberRoles(member, language, { within: collection }));
	const roles = resolveRoles(collection, language);

	return roles.map((role, index) => {
		const memberHasRole = memberRoles.some((memberRole) =>
			memberRole.name === role.name
		);

		return {
			label: memberHasRole ? `[Assigned] ${role.name}` : role.name,
			value: index.toString(),
			description: role.description,
			emoji: { name: role.emoji },
		};
	});
}

/**
 * Extracts the list of roles from within a role collection and returns it.
 *
 * @param collection - The collection from which to read the list of roles.
 * @param language - The language concerning the guild.
 * @returns The list of roles within the collection.
 */
function resolveRoles(
	collection: RoleCollection,
	language: string | undefined,
): Role[] {
	if (collection.type === RoleCollectionType.COLLECTION_LOCALISED) {
		return collection.lists![language!]!;
	}
	return collection.list!;
}

/**
 * Gets a list of the member's roles, and optionally omits those not present
 * within the {@link RoleCollection}.
 *
 * @param member - The member whose roles to get.
 * @param language - The language concerning the guild.
 */
async function getMemberRoles(
	member: Member,
	language: string | undefined,
	options: { within: RoleCollection },
): Promise<Role[]> {
	const memberRoles = (await member.roles.array()) ?? [];
	return resolveRoles(options.within, language).filter((role) =>
		memberRoles.some((memberRole) => memberRole.name === role.name)
	);
}

export {
	createSelectionsFromCollection,
	getMemberRoles,
	resolveRoles,
	RoleCollectionType,
};
export type { RoleCollection };
