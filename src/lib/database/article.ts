import { LearningLanguage } from "../../constants/languages";

interface Article {
	id: string;
	guildId: string;
	/** @remarks Guaranteed to contain at least one language. */
	languages: LearningLanguage[];
	/** @remarks Guaranteed to contain at least one version; the first version is the original author. */
	versions: ArticleVersion[];
	editedAt?: number;
}

interface ArticleVersion {
	title: string;
	body: string;
	footnotes: string;
	authorId: string;
	createdAt: number;
}

export type { Article, ArticleVersion };
