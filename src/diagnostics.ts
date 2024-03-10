type ID = bigint | string;
type Indexable<T> = T | ID;

function isId<T>(object: Indexable<T>): object is bigint | string {
	return typeof object === "bigint" || typeof object === "string";
}

const diagnostics = {
	display: {
		user: (
			userOrId: Indexable<Logos.User | Discord.User | Discord.CamelizedDiscordUser>,
			options?: { prettify?: boolean; includeId?: boolean },
		) => {
			if (isId(userOrId)) {
				return `unnamed user (ID ${userOrId})`;
			}

			const { username, discriminator, id } = userOrId;

			const tag = discriminator === "0" ? `@${username}` : `${username}#${discriminator}`;

			if (!(options?.includeId ?? false)) {
				return tag;
			}

			if (options?.prettify ?? false) {
				return `${tag} · ${id}`;
			}

			return `${tag} (${id})`;
		},
		member: ({ user, id }: Logos.Member | Discord.Member) => {
			if (user !== undefined) {
				return diagnostics.display.user(user);
			}

			return `unidentified member (ID ${id})`;
		},
		role: (roleOrId: Indexable<Logos.Role | Discord.Role | Discord.CamelizedDiscordRole>) => {
			if (isId(roleOrId)) {
				return `unnamed role (ID ${roleOrId})`;
			}

			const { name, id } = roleOrId;

			return `role "${name}" (ID ${id})`;
		},
		guild: (guildOrId: Indexable<Logos.Guild | Discord.Guild | Discord.CamelizedDiscordGuild>) => {
			if (isId(guildOrId)) {
				return `unnamed guild (ID ${guildOrId})`;
			}

			const { name, id } = guildOrId;

			return `"${name}" (ID ${id})`;
		},
		message: (messageOrId: Indexable<Logos.Message | Discord.Message | Discord.CamelizedDiscordMessage>) => {
			if (isId(messageOrId)) {
				return `unidentified message (ID ${messageOrId})`;
			}

			const { id } = messageOrId;

			return `message (ID ${id})`;
		},
		channel: (channelOrId: Indexable<Logos.Channel | Discord.Channel | Discord.CamelizedDiscordChannel>) => {
			if (isId(channelOrId)) {
				return `unidentified channel (ID ${channelOrId})`;
			}

			const { name, id, type } = channelOrId;

			if (name === undefined) {
				return `unnamed channel (ID ${id})`;
			}

			switch (type) {
				case Discord.ChannelTypes.DM:
				case Discord.ChannelTypes.GroupDm: {
					return `DM "${name}" (ID ${id})`;
				}
				case Discord.ChannelTypes.GuildVoice:
				case Discord.ChannelTypes.GuildStageVoice: {
					return `VC "${name}" (ID ${id})`;
				}
				case Discord.ChannelTypes.PublicThread:
				case Discord.ChannelTypes.PrivateThread: {
					return `Thread "${name}" (ID ${id})`;
				}
				default:
					return `#${name} (ID ${id})`;
			}
		},
	},
};

export default Object.freeze(diagnostics);
