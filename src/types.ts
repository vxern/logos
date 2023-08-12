import { FeatureLanguage, LearningLanguage, Locale, LocalisationLanguage } from "./constants/languages";
import * as Discord from "discordeno";

type Guild = Pick<
	Discord.Guild,
	"description" | "icon" | "id" | "name" | "emojis" | "ownerId" | "memberCount" | "shardId"
> & {
	roles: Discord.Collection<bigint, Role>;
	members: Discord.Collection<bigint, Member>;
	channels: Discord.Collection<bigint, Channel>;
	voiceStates: Discord.Collection<bigint, VoiceState>;
};

function slimGuild(guild: Discord.Guild): Guild {
	return {
		description: guild.description,
		icon: guild.icon,
		id: guild.id,
		name: guild.name,
		roles: new Discord.Collection(guild.roles.map((role, key) => [key, slimRole(role)])),
		emojis: guild.emojis,
		members: new Discord.Collection(guild.members.map((member, key) => [key, slimMember(member)])),
		channels: new Discord.Collection(guild.channels.map((channel, key) => [key, slimChannel(channel)])),
		ownerId: guild.ownerId,
		memberCount: guild.memberCount,
		shardId: guild.shardId,
		voiceStates: new Discord.Collection(guild.voiceStates.map((voiceState, key) => [key, slimVoiceState(voiceState)])),
	};
}

type Channel = Pick<Discord.Channel, "guildId" | "position" | "name" | "parentId" | "id" | "type" | "rateLimitPerUser">;

function slimChannel(channel: Discord.Channel): Channel {
	return {
		guildId: channel.guildId,
		position: channel.position,
		id: channel.id,
		name: channel.name,
		parentId: channel.parentId,
		type: channel.type,
		rateLimitPerUser: channel.rateLimitPerUser,
	};
}

type User = Pick<Discord.User, "avatar" | "discriminator" | "id" | "username" | "toggles">;

function slimUser(user: Discord.User): User {
	return {
		avatar: user.avatar,
		discriminator: user.discriminator,
		id: user.id,
		username: user.username,
		toggles: user.toggles,
	};
}

type Member = Pick<
	Discord.Member,
	"avatar" | "permissions" | "nick" | "communicationDisabledUntil" | "id" | "guildId" | "roles" | "joinedAt"
> & { user?: User };

function slimMember(member: Discord.Member): Member {
	return {
		avatar: member.avatar,
		permissions: member.permissions,
		user: member.user === undefined ? undefined : slimUser(member.user),
		nick: member.nick,
		communicationDisabledUntil: member.communicationDisabledUntil,
		id: member.id,
		guildId: member.guildId,
		roles: member.roles,
		joinedAt: member.joinedAt,
	};
}

type Message = Pick<
	Discord.Message,
	"guildId" | "components" | "id" | "type" | "channelId" | "timestamp" | "content" | "embeds" | "authorId"
>;

function slimMessage(message: Discord.Message): Message {
	return {
		guildId: message.guildId,
		components: message.components,
		id: message.id,
		type: message.type,
		channelId: message.channelId,
		timestamp: message.timestamp,
		content: message.content,
		embeds: message.embeds,
		authorId: message.authorId,
	};
}

type Role = Pick<Discord.Role, "guildId" | "id" | "position" | "name" | "permissions" | "color">;

function slimRole(role: Discord.Role): Role {
	return {
		guildId: role.guildId,
		id: role.id,
		position: role.position,
		name: role.name,
		permissions: role.permissions,
		color: role.color,
	};
}

type VoiceState = Pick<Discord.VoiceState, "guildId" | "channelId" | "userId">;

function slimVoiceState(voiceState: Discord.VoiceState): VoiceState {
	return {
		guildId: voiceState.guildId,
		channelId: voiceState.channelId,
		userId: voiceState.userId,
	};
}

interface InteractionLocaleData {
	locale: Locale;
	language: LocalisationLanguage;
	learningLanguage: LearningLanguage;
	guildLocale: Locale;
	guildLanguage: LocalisationLanguage;
	featureLanguage: FeatureLanguage;
}

type Interaction = Omit<Discord.Interaction, "locale" | "guildLocale"> & InteractionLocaleData;

export {
	Guild,
	slimGuild,
	Channel,
	slimChannel,
	User,
	slimUser,
	Member,
	slimMember,
	Message,
	slimMessage,
	Role,
	slimRole,
	VoiceState,
	slimVoiceState,
	Interaction,
	InteractionLocaleData,
};
