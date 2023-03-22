import { Language } from 'logos/types.ts';

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

export { isCategory, isCategoryGroup, isLocalised, isStandalone, RoleCategoryTypes, RoleCollectionTypes };
export type { Role, RoleCategory, RoleCategoryBase, RoleCategoryStandalone, RoleCollection };
