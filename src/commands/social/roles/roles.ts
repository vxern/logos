import dialects from 'logos/src/commands/social/roles/categories/dialects.ts';
import ethnicity from 'logos/src/commands/social/roles/categories/ethnicity.ts';
import language from 'logos/src/commands/social/roles/categories/language.ts';
import learning from 'logos/src/commands/social/roles/categories/learning.ts';
import personalisation from 'logos/src/commands/social/roles/categories/personalisation.ts';
import regions from 'logos/src/commands/social/roles/categories/regions.ts';
import { Language } from 'logos/types.ts';

const categories: RoleCategory[] = [language, learning, dialects, personalisation, regions, ethnicity];

function getRelevantCategories(categories: RoleCategory[], language: Language | undefined): [RoleCategory, number][] {
	const selectedRoleCategories: [RoleCategory, number][] = [];

	for (const index of Array(categories.length).keys()) {
		const category = categories.at(index)!;

		if (isCategoryGroup(category)) {
			selectedRoleCategories.push([category, index]);
			continue;
		}

		if (isLocalised(category.collection)) {
			if (language === undefined) continue;
			if (!(language in category.collection.lists)) continue;
		}

		selectedRoleCategories.push([category, index]);
	}

	return selectedRoleCategories;
}

/**
 * Extracts the list of roles from within a role collection and returns it.
 *
 * @param collection - The collection from which to read the list of roles.
 * @param language - The language concerning the guild.
 * @returns The list of roles within the collection.
 */
function resolveRoles(collection: RoleCollection, language: Language | undefined): Role[] {
	if (isStandalone(collection)) {
		return collection.list;
	}

	if (language === undefined) return [];

	return collection.lists[language] ?? [];
}

/** Represents a selectable role within a role selection menu.  */
interface Role {
	id: string;

	/** Emoji to be displayed next to the role name. */
	emoji?: string;
}

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

	/** This category's identifier. */
	id?: string;

	/** The colour to be displayed in the embed message when this category is selected. */
	color: number;

	/** The emoji to be displayed next to this category in the select menu. */
	emoji: string;
};

/** The base of a group of role categories. */
type RoleCategoryGroup = RoleCategoryBase & {
	type: RoleCategoryTypes.CategoryGroup;

	/** The subcategories in this role category. */
	categories: RoleCategory[];
};

/** The base of a standalone role category. */
type RoleCategoryStandalone = RoleCategoryBase & {
	type: RoleCategoryTypes.Category;

	collection: RoleCollection;

	maximum?: number;
	minimum?: number;
};

/** Represents a thematic selection of {@link Role}s. */
type RoleCategory =
	| RoleCategoryGroup
	| RoleCategoryStandalone;

function isCategoryGroup(category: RoleCategory): category is RoleCategoryGroup {
	return category.type === RoleCategoryTypes.CategoryGroup;
}

function isCategory(category: RoleCategory): category is RoleCategoryStandalone {
	return category.type === RoleCategoryTypes.Category;
}

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
};

/** The base of a role collection with a standalone group of roles. */
type RoleCollectionStandalone = RoleCollectionBase & {
	type: RoleCollectionTypes.Collection;

	/** The roles in this role collection. */
	list: Role[];
};

/** The base of a role collection with localised groups of roles. */
type RoleCollectionLocalised = RoleCollectionBase & {
	type: RoleCollectionTypes.CollectionLocalised;

	/** Groups of roles defined by language in this role collection. */
	lists: Partial<Record<Language, Role[]>>;
};

/** Represents a grouping of roles. */
type RoleCollection = RoleCollectionStandalone | RoleCollectionLocalised;

function isStandalone(collection: RoleCollection): collection is RoleCollectionStandalone {
	return collection.type === RoleCollectionTypes.Collection;
}

function isLocalised(collection: RoleCollection): collection is RoleCollectionLocalised {
	return collection.type === RoleCollectionTypes.CollectionLocalised;
}

export {
	getRelevantCategories,
	isCategory,
	isCategoryGroup,
	isLocalised,
	isStandalone,
	resolveRoles,
	RoleCategoryTypes,
	RoleCollectionTypes,
};
export type {
	Role,
	RoleCategory,
	RoleCategoryBase,
	RoleCategoryGroup,
	RoleCategoryStandalone,
	RoleCollection,
	RoleCollectionStandalone,
};
export default categories;
