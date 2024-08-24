import type { FeatureLanguage } from "logos:constants/languages/feature";
import type { LearningLanguage } from "logos:constants/languages/learning";
import type { LocalisationLanguage } from "logos:constants/languages/localisation";
import type { Client } from "logos/client";
import { GuildStatistics } from "logos/models/guild-statistics";
import { type IdentifierData, Model } from "logos/models/model";
// biome-ignore lint/nursery/noExportedImports: The re-export of `RateLimit` is okay for now.
import type { GuildDocument, RateLimit } from "logos/models/versions/guild/latest";
import type { DatabaseStore } from "logos/stores/database";

type CreateGuildOptions = Partial<GuildDocument> & IdentifierData<Guild>;

// biome-ignore lint/correctness/noUnusedVariables: Used for merging declarations.
interface Guild extends GuildDocument {}

/** @since v3.0.0 */
class Guild extends Model<{ collection: "Guilds"; idParts: ["guildId"] }> {
	readonly createdAt: number;

	get guildId(): string {
		return this.idParts[0];
	}

	get localisationLanguage(): LocalisationLanguage {
		return this.languages.localisation;
	}

	get targetLanguage(): LearningLanguage {
		return this.languages.target;
	}

	get featureLanguage(): FeatureLanguage {
		return this.languages.feature;
	}

	constructor(database: DatabaseStore, { createdAt, languages, features, isNative, ...data }: CreateGuildOptions) {
		super(database, data, { collection: "Guilds" });

		this.createdAt = createdAt ?? Date.now();
		this.languages = languages ?? {
			localisation: constants.defaults.LOCALISATION_LANGUAGE,
			target: constants.defaults.LEARNING_LANGUAGE,
			feature: constants.defaults.FEATURE_LANGUAGE,
		};
		this.features = features ?? {};
		this.isNative = isNative ?? false;
	}

	static get(client: Client, data: IdentifierData<Guild>): Guild | Promise<Guild | undefined> | undefined {
		const partialId = Model.buildPartialId(data);
		if (client.documents.guilds.has(partialId)) {
			return client.documents.guilds.get(partialId)!;
		}

		return client.database.withSession((session) => {
			return session.get<Guild>(Model.buildId(data, { collection: "Guilds" }));
		});
	}

	static async create(client: Client, data: CreateGuildOptions): Promise<Guild> {
		const guildDocument = await client.database.withSession((session) => {
			return session.set(new Guild(client.database, data));
		});

		await GuildStatistics.getOrCreate(client, { guildId: guildDocument.id.toString() });

		return guildDocument;
	}

	static async getOrCreate(client: Client, data: CreateGuildOptions): Promise<Guild> {
		const guildDocument = await Guild.get(client, data);
		if (guildDocument !== undefined) {
			return guildDocument;
		}

		return Guild.create(client, data);
	}

	hasEnabled(feature: keyof Guild["enabledFeatures"]): boolean {
		return this.enabledFeatures[feature];
	}

	feature<K extends keyof Guild["features"]>(feature: K): Guild["features"][K] {
		// If the guild does not have the feature enabled, do not return any data about the feature.
		if (!this.hasEnabled(feature)) {
			return undefined;
		}

		return this.features[feature];
	}

	// TODO(vxern): Create method to check for a feature being journalled.

	// TODO(vxern): Create method to check for rate limits.

	// TODO(vxern): Create method to check for management over a feature.

	isTargetLanguageOnly(channelId: string): boolean {
		return this.feature("targetOnly")?.channelIds?.includes(channelId) ?? false;
	}
}

export { Guild };
export type { CreateGuildOptions, RateLimit };
