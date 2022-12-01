import { Role as DiscordRole, SelectOption } from 'discordeno';
import { Commands, localise } from 'logos/assets/localisations/mod.ts';
import roles from 'logos/src/commands/social/data/roles.ts';
import {
	Role,
	RoleCategory,
	RoleCategoryTypes,
	RoleCollection,
	RoleCollectionTypes,
} from 'logos/src/commands/social/data/types.ts';
import { trim } from 'logos/src/utils.ts';
import { defaultLocale, Language } from 'logos/types.ts';

type ProficiencyCategory = RoleCategory & {
	type: RoleCategoryTypes.Category;
	collection: RoleCollection & { type: RoleCollectionTypes.Collection };
};

/**
 * Finds and returns the 'Proficiency' category.
 *
 * @returns The category with proficiency roles.
 */
function getProficiencyCategory(): ProficiencyCategory {
	return <ProficiencyCategory> roles.find((category) => localise(category.name, defaultLocale) === 'Proficiency')!;
}

function createSelectOptionsFromCategories(
	categories: RoleCategory[],
	language: Language | undefined,
	locale: string | undefined,
): SelectOption[] {
	const categorySelections = getRelevantCategories(categories, language);

	const selections: SelectOption[] = [];
	for (const [category, index] of categorySelections) {
		selections.push({
			label: localise(category.name, locale),
			value: index.toString(),
			description: trim(localise(category.description, locale), 100),
			emoji: { name: category.emoji },
		});
	}

	return selections;
}

function getRelevantCategories(
	categories: RoleCategory[],
	language: Language | undefined,
): [RoleCategory, number][] {
	const selectedRoleCategories: [RoleCategory, number][] = [];

	for (let index = 0; index < categories.length; index++) {
		const category = categories.at(index)!;

		if (category.type === RoleCategoryTypes.CategoryGroup) {
			selectedRoleCategories.push([category, index]);
			continue;
		}

		if (category.collection.type === RoleCollectionTypes.CollectionLocalised) {
			if (language === undefined) continue;
			if (!(language in category.collection.lists)) continue;
		}

		selectedRoleCategories.push([category, index]);
	}

	return selectedRoleCategories;
}

const emojiExpression = /\p{Extended_Pictographic}/u;

function createSelectOptionsFromCollection(
	menuRoles: Role[],
	menuRolesResolved: DiscordRole[],
	memberRolesIncludedInMenu: bigint[],
	emojiIdsByName: Map<string, bigint>,
	locale: string | undefined,
): SelectOption[] {
	const selectOptions: SelectOption[] = [];

	for (let index = 0; index < menuRoles.length; index++) {
		const [role, roleResolved] = [
			menuRoles.at(index)!,
			menuRolesResolved.at(index)!,
		];
		const memberHasRole = memberRolesIncludedInMenu.includes(roleResolved.id);

		const localisedName = localise(role.name, locale);

		selectOptions.push({
			label: memberHasRole
				? `[${localise(Commands.profile.options.roles.strings.assigned, locale)}] ${localisedName}`
				: localisedName,
			value: index.toString(),
			description: role.description !== undefined ? localise(role.description, locale) : undefined,
			emoji: (() => {
				if (role.emoji === undefined) return;
				if (emojiExpression.test(role.emoji)) return { name: role.emoji };

				const id = emojiIdsByName.get(role.emoji);
				if (id === undefined) return { name: '❓' };

				return { name: role.emoji, id };
			})(),
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
		if (language === undefined) return [];

		return collection.lists[language] ?? [];
	}

	return collection.list;
}

export {
	createSelectOptionsFromCategories,
	createSelectOptionsFromCollection,
	getProficiencyCategory,
	getRelevantCategories,
	resolveRoles,
};
