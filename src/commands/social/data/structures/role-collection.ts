import { Member, SelectOption } from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import { Language } from '../../../../types.ts';
import { Assignable, DescriptionGenerator, Role } from './role.ts';

/** Defines the type of a role collection. */
enum RoleCollectionTypes {
	Collection,
	CollectionLocalised,
}

type RoleCollection<T = Assignable> =
	& T
	& {
		/** The type of this collection. */
		type: RoleCollectionTypes;

		/** Description applied to roles in this collection without a description. */
		description?: DescriptionGenerator;
	}
	& ({
		type: RoleCollectionTypes.Collection;

		/** List of roles within this collection. */
		list: Role[];
	} | {
		type: RoleCollectionTypes.CollectionLocalised;

		/** Lists of roles with languages as keys. */
		lists: Partial<Record<Language, Role[]>>;
	});

function createSelectionsFromCollection(
	client: Client,
	member: Member,
	language: Language | undefined,
	collection: RoleCollection,
): SelectOption[] | undefined {
	const guild = client.guilds.get(member.guildId!);
	if (!guild) return undefined;

	const memberRoleNames: string[] = [];
	for (const roleId of member.roles) {
		const role = guild.roles.get(roleId);
		if (!role) return undefined;

		memberRoleNames.push(role.name);
	}

	const roles = resolveRoles(collection, language);

	const selectOptions = roles.map<SelectOption>((role, index) => {
		const memberHasRole = memberRoleNames.some((memberRoleName) =>
			memberRoleName === role.name
		);

		return {
			label: memberHasRole ? `[Assigned] ${role.name}` : role.name,
			value: index.toString(),
			description: role.description,
			emoji: { name: role.emoji },
		};
	});

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

export { createSelectionsFromCollection, resolveRoles, RoleCollectionTypes };
export type { RoleCollection };
