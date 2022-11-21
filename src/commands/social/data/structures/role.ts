import { Localisations } from 'logos/assets/localisations/mod.ts';

/** Represents a selectable role within a role selection menu.  */
interface Role {
	/** Role name corresponding to the guild role name. */
	name: Localisations<string>;

	/** Description of this role's purpose. */
	description?: Localisations<string>;

	/** Emoji to be displayed next to the role name. */
	emoji?: string;
}

export type { Role };
