import { Member, MessageComponentOption } from '../../../../../../deps.ts';
import {
	RoleCategory,
	RoleCategoryType,
} from '../../../data/structures/role-category.ts';
import {
	getMemberRoles,
	resolveRoles,
	RoleCollection,
} from '../../../data/structures/role-collection.ts';

async function displaySelections(
	member: Member,
	language: string | undefined,
	category: RoleCategory,
): Promise<MessageComponentOption[]> {
	if (category.type === RoleCategoryType.CATEGORY_GROUP) {
		return createSelectionsFromCategories(category.categories!);
	}
	return await createSelectionsFromCollection(
		member,
		language,
		category.collection!,
	);
}

function createSelectionsFromCategories(
	categories: RoleCategory[],
): MessageComponentOption[] {
	return categories.map((category, index) => {
		return {
			label: category.name,
			value: index.toString(),
			description: category.description.length > 100
				? category.description.slice(0, 97) + '...'
				: category.description,
			emoji: { name: category.emoji },
			disabled: true,
		};
	});
}

async function createSelectionsFromCollection(
	member: Member,
	language: string | undefined,
	collection: RoleCollection,
): Promise<MessageComponentOption[]> {
	const memberRoles =
		(await getMemberRoles(member, language, { within: collection }));
	const roles = resolveRoles(collection, language);
	return roles.map((role, index) => {
		const memberHasRole = memberRoles.some((memberRole) =>
			memberRole.name === role.name
		);
		return {
			label: `${memberHasRole ? '[Assigned] ' : ''}${role.name}`,
			value: index.toString(),
			description: role.description,
			emoji: { name: role.emoji },
		};
	});
}

export { displaySelections };
