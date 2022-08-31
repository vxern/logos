import { Role as DiscordRole, SelectOption } from '../../../../../deps.ts';
import { Language } from '../../../../types.ts';
import { Assignable, DescriptionGenerator, Role } from './role.ts';

/** The type of role collection. */
enum RoleCollectionTypes {
	/** A collection of roles. */
	Collection,

	/** A group of role collections that differ depending on the language. */
	CollectionLocalised,
}

/**
 * The base of a role collection.
 *
 * This type defines the core properties that all role collections must define.
 */
type RoleCollectionBase = {
	/** The type of this collection. */
	type: RoleCollectionTypes;

	/** A default description for roles contained within this collection.. */
	generateDescription?: DescriptionGenerator;
};

/** The base of a role collection with a standalone group of roles. */
type RoleCollectionStandalone = {
	type: RoleCollectionTypes.Collection;

	/** The roles in this role collection. */
	list: Role[];
};

/** The base of a role collection with localised groups of roles. */
type RoleCollectionLocalised = {
	type: RoleCollectionTypes.CollectionLocalised;

	/** Groups of roles defined by language in this role collection. */
	lists: Partial<Record<Language, Role[]>>;
};

/** Represents a grouping of roles. */
type RoleCollection<T = Assignable> =
	& RoleCollectionBase
	& T
	& (RoleCollectionStandalone | RoleCollectionLocalised);

function createSelectOptionsFromCollection(
	menuRoles: Role[],
	menuRolesResolved: DiscordRole[],
	memberRolesIncludedInMenu: bigint[],
): SelectOption[] {
	const selectOptions: SelectOption[] = [];

	for (let index = 0; index < menuRoles.length; index++) {
		const [role, roleResolved] = [menuRoles[index]!, menuRolesResolved[index]!];
		const memberHasRole = memberRolesIncludedInMenu.includes(roleResolved.id);

		selectOptions.push({
			label: memberHasRole ? `[Assigned] ${role.name}` : role.name,
			value: index.toString(),
			description: role.description,
			emoji: { name: role.emoji },
		});
	}

	return selectOptions;
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
	language: Language | undefined,
): Role[] {
	if (collection.type === RoleCollectionTypes.CollectionLocalised) {
		if (!language) return [];

		return collection.lists[language] ?? [];
	}

	return collection.list;
}

export { createSelectOptionsFromCollection, resolveRoles, RoleCollectionTypes };
export type { RoleCollection };
