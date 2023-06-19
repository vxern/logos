/** Represents a selectable role within a role selection menu.  */
interface RoleBase {
	id: string;

	/** Emoji to be displayed next to the role name. */
	emoji?: string;
}

interface RoleImplicit extends RoleBase {
	snowflakes: Record<string, string>;
}

interface RoleCustom extends RoleBase {
	snowflake: string;
}

type Role = RoleImplicit | RoleCustom;

/** The type of role category. */
type RoleCategoryTypes =
	/** A standalone role category. */
	| 'single'
	/** A role category acting as a thematic grouping for other role categories. */
	| 'group';

/**
 * The base of a role category.
 *
 * This type defines the core properties that all role categories must define.
 */
interface RoleCategoryBase {
	/** The type of this category. */
	type: RoleCategoryTypes;

	/** This category's identifier. */
	id: string;

	/** The colour to be displayed in the embed message when this category is selected. */
	color: number;

	/** The emoji to be displayed next to this category in the select menu. */
	emoji: string;
}

/** The base of a role category. */
interface RoleCategorySingle extends RoleCategoryBase {
	type: 'single';

	collection: RoleCollection;

	maximum?: number;
	minimum?: number;
}

/** The base of a group of role categories. */
interface RoleCategoryGroup extends RoleCategoryBase {
	type: 'group';

	/** The subcategories in this role category. */
	categories: RoleCategory[];
}

/** Represents a thematic selection of {@link Role}s. */
type RoleCategory = RoleCategorySingle | RoleCategoryGroup;

function isSingle(category: RoleCategory): category is RoleCategorySingle {
	return category.type === 'single';
}

function isGroup(category: RoleCategory): category is RoleCategoryGroup {
	return category.type === 'group';
}

/** The type of role collection. */
type RoleCollectionTypes =
	/** A collection of roles. */
	| 'implicit'
	/** A group of role collections that differ depending on the guild. */
	| 'custom';

/**
 * The base of a role collection.
 *
 * This type defines the core properties that all role collections must define.
 */
type RoleCollectionBase = {
	/** The type of this collection. */
	type: RoleCollectionTypes;
};

/** The base of an implicit role collection. */
interface RoleCollectionImplicit extends RoleCollectionBase {
	type: 'implicit';

	/** The roles in this role collection. */
	list: RoleImplicit[];
}

/** The base of a custom role collection. */
interface RoleCollectionCustom extends RoleCollectionBase {
	type: 'custom';

	/** Groups of roles defined by guild ID in this role collection. */
	lists: Record<string, RoleCustom[]>;
}

/** Represents a grouping of roles. */
type RoleCollection = RoleCollectionImplicit | RoleCollectionCustom;

function isImplicit(collection: RoleCollection): collection is RoleCollectionImplicit {
	return collection.type === 'implicit';
}

function isCustom(collection: RoleCollection): collection is RoleCollectionCustom {
	return collection.type === 'custom';
}

export { isCustom, isGroup, isImplicit, isSingle };
export type {
	Role,
	RoleCategory,
	RoleCategoryBase,
	RoleCategoryGroup,
	RoleCategorySingle,
	RoleCollection,
	RoleCollectionImplicit,
	RoleCustom,
	RoleImplicit,
};
