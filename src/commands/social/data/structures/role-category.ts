import { SelectOption } from '../../../../../deps.ts';
import { Language } from '../../../../types.ts';
import { trim } from '../../../../utils.ts';
import { Assignable } from './role.ts';
import { RoleCollection, RoleCollectionTypes } from './role-collection.ts';

/** The type of role category. */
enum RoleCategoryTypes {
	/** A role category acting as a thematic grouping for other role categories. */
	CategoryGroup,

	/** A standalone role category. */
	Category,
}

/**
 * The base of a role category.
 *
 * This type defines the core properties that all role categories must define.
 */
type RoleCategoryBase = {
	/** The type of this category. */
	type: RoleCategoryTypes;

	/** The display name of this category. */
	name: string;

	/** A description for what roles or role categories this role category contains. */
	description: string;

	/** The colour to be displayed in the embed message when this category is selected. */
	color: number;

	/** The emoji to be displayed next to this category in the select menu. */
	emoji: string;
};

/** The base of a group of role categories. */
type RoleCategoryGroup = {
	type: RoleCategoryTypes.CategoryGroup;

	/** The subcategories in this role category. */
	categories: RoleCategory[];
};

/** The base of a standalone role category. */
type RoleCategoryStandalone<
	T = SingleAssignableRoleCategory | MultipleAssignableRoleCategory,
> = {
	type: RoleCategoryTypes.Category;

	/** Whether or not only one role can be selected from this category. */
	restrictToOneRole: boolean;
} & T;

/** A role category that allows only one role to be selected from it at any one time. */
type SingleAssignableRoleCategory = {
	// Because only one role can be selected at any one time from this category, and
	// once a role has been selected, it cannot be unselected again, the message to be
	// shown when a role is unassigned will never be shown to the user.
	collection: RoleCollection<Omit<Assignable, 'onUnassignMessage'>>;

	restrictToOneRole: true;
};

/** A role category that allows more than one role to be selected from it. */
type MultipleAssignableRoleCategory = {
	collection: RoleCollection;

	restrictToOneRole: false;

	/** The maximum number of roles that can be selected from this category. */
	limit?: number;
};

/** Represents a thematic selection of {@link Role}s. */
type RoleCategory =
	& RoleCategoryBase
	& (
		| RoleCategoryGroup
		| RoleCategoryStandalone
	);

function createSelectOptionsFromCategories(
	categories: RoleCategory[],
	language: Language | undefined,
): SelectOption[] {
	const categorySelections = getRelevantCategories(categories, language);

	const selections: SelectOption[] = [];
	for (let index = 0; index < categorySelections.length; index++) {
		const category = categorySelections.at(index)!;

		selections.push({
			label: category.name,
			value: index.toString(),
			description: trim(category.description, 100),
			emoji: { name: category.emoji },
		});
	}

	return selections;
}

function getRelevantCategories(
	categories: RoleCategory[],
	language: Language | undefined,
): RoleCategory[] {
	const selectedRoleCategories: RoleCategory[] = [];

	for (const category of categories) {
		if (category.type === RoleCategoryTypes.CategoryGroup) {
			selectedRoleCategories.push(category);
			continue;
		}

		if (category.collection.type === RoleCollectionTypes.CollectionLocalised) {
			if (!language) continue;
			if (!(language in category.collection.lists)) continue;
		}

		selectedRoleCategories.push(category);
	}

	return selectedRoleCategories;
}

export {
	createSelectOptionsFromCategories,
	getRelevantCategories,
	RoleCategoryTypes,
};
export type { RoleCategory, RoleCategoryBase, RoleCategoryStandalone };
