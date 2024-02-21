import * as Discord from "@discordeno/bot";
import { FeatureLanguage, LearningLanguage, Locale, LocalisationLanguage } from "./constants/languages";

const desiredProperties = {
	guild: {
		description: true,
		icon: true,
		id: true,
		name: true,
		roles: true,
		emojis: true,
		members: true,
		channels: true,
		ownerId: true,
		memberCount: true,
		shardId: true,
		voiceStates: true,
	},
	channel: {
		guildId: true,
		position: true,
		id: true,
		name: true,
		parentId: true,
		type: true,
		rateLimitPerUser: true,
		permissionOverwrites: true,
	},
	user: {
		avatar: true,
		discriminator: true,
		id: true,
		username: true,
		bot: true,
	},
	member: {
		avatar: true,
		permissions: true,
		user: true,
		nick: true,
		communicationDisabledUntil: true,
		id: true,
		guildId: true,
		roles: true,
		joinedAt: true,
	},
	message: {
		guildId: true,
		components: true,
		id: true,
		type: true,
		channelId: true,
		content: true,
		embeds: true,
		author: true,
		interaction: {},
		messageReference: {},
	},
	role: {
		guildId: true,
		id: true,
		position: true,
		name: true,
		permissions: true,
		color: true,
	},
	emoji: {
		id: true,
		name: true,
		roles: true,
		user: true,
	},
	attachment: {},
	interaction: {
		id: true,
		applicationId: true,
		type: true,
		guildId: true,
		channelId: true,
		member: true,
		user: true,
		token: true,
		data: true,
		locale: true,
		guildLocale: true,
	},
	// TODO(vxern): Get rid of unnecessary data.
	invite: {
		channelId: true,
		code: true,
		createdAt: true,
		guildId: true,
		inviter: true,
		maxAge: true,
		maxUses: true,
		temporary: true,
		uses: true,
		approximateMemberCount: true,
		approximatePresenceCount: true,
		expiresAt: true,
	},
	scheduledEvent: {},
	stageInstance: {},
	inviteStageInstance: {},
	sticker: {},
	webhook: {},
	guildOnboarding: {
		prompts: {
			options: {},
		},
	},
	entitlement: {},
	sku: {},
} as const satisfies Discord.DesiredProperties;
type LogosDesiredProperties = typeof desiredProperties;

type Guild = Pick<
	Omit<Discord.Guild, "roles" | "members" | "channels" | "voiceStates"> & {
		roles: Discord.Collection<bigint, Role>;
		members: Discord.Collection<bigint, Member>;
		channels: Discord.Collection<bigint, Channel>;
		voiceStates: Discord.Collection<bigint, VoiceState>;
	},
	keyof LogosDesiredProperties["guild"]
>;

type Channel = Pick<Discord.Channel, keyof LogosDesiredProperties["channel"]>;

type User = Pick<Discord.User, keyof LogosDesiredProperties["user"]>;

type Member = Pick<Discord.Member & { user?: User }, keyof LogosDesiredProperties["member"]>;

type Message = Pick<Discord.Message, keyof LogosDesiredProperties["message"]>;

type Role = Pick<Discord.Role, keyof LogosDesiredProperties["role"]>;

// TODO(vxern): Should this be in the desired properties?
type VoiceState = Pick<Discord.VoiceState, "guildId" | "channelId" | "userId">;

interface InteractionLocaleData {
	locale: Locale;
	language: LocalisationLanguage;
	learningLanguage: LearningLanguage;
	featureLanguage: FeatureLanguage;
	guildLocale: Locale;
	guildLanguage: LocalisationLanguage;
}

type InteractionParameters<Parameters> = Parameters & { show: boolean; focused?: keyof Parameters };

type Interaction<
	Metadata extends string[] = any,
	Parameters extends Record<string, string | number | boolean | undefined> = any,
> = Omit<Pick<Discord.Interaction, keyof LogosDesiredProperties["interaction"]>, "locale" | "guildLocale"> &
	InteractionLocaleData & {
		commandName: string;
		metadata: [customId: string, ...data: Metadata];
		parameters: InteractionParameters<Parameters>;
	};

export { desiredProperties };
export type {
	Guild,
	Channel,
	User,
	Member,
	Message,
	Role,
	VoiceState,
	Interaction,
	InteractionLocaleData,
	InteractionParameters,
};
