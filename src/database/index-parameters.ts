import { Reference } from 'logos/src/database/structs/document.ts';
import { Language } from 'logos/types.ts';

interface ArticleIndexParameters {
	/** The language of the article. */
	language: Language;

	/** The dialect of the article. */
	dialect: string;

	/** The author of the article. */
	author: Reference;
}

interface ArticleChangeIndexParameters {
	/** The reference to the article document the change was made to. */
	articleReference: Reference;

	/** The author of the article change. */
	author: Reference;
}

interface PraiseIndexParameters {
	/** The reference to the author of database praise. */
	author: Reference;

	/** The reference to the recipient of database praise. */
	subject: Reference;
}

interface UserIndexParameters {
	/** The reference to the user. */
	reference: Reference;

	/** The ID of the user. */
	id: string;
}

interface WarningIndexParameters {
	/** The reference to the warning document. */
	reference: Reference;
}

export type {
	ArticleChangeIndexParameters,
	ArticleIndexParameters,
	PraiseIndexParameters,
	UserIndexParameters,
	WarningIndexParameters,
};
