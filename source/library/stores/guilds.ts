import type { Client } from "logos/client";
import { Collector } from "logos/collectors";
import { ActionLock } from "logos/helpers/action-lock";
import { Guild } from "logos/models/guild";
import { Model } from "logos/models/model";
import type { CommandStore } from "logos/stores/commands";
import type { ServiceStore } from "logos/stores/services";
import type pino from "pino";

class GuildStore {
	readonly log: pino.Logger;

	readonly #client: Client;
	readonly #services: ServiceStore;
	readonly #commands: CommandStore;
	readonly #guildReloadLock: ActionLock;
	readonly #guildCreateCollector: Collector<"guildCreate">;
	readonly #guildDeleteCollector: Collector<"guildDelete">;

	constructor(client: Client, { services, commands }: { services: ServiceStore; commands: CommandStore }) {
		this.log = client.log.child({ name: "GuildStore" });

		this.#client = client;
		this.#services = services;
		this.#commands = commands;
		this.#guildReloadLock = new ActionLock();
		this.#guildCreateCollector = new Collector<"guildCreate">();
		this.#guildDeleteCollector = new Collector<"guildDelete">();
	}

	async setup(): Promise<void> {
		this.log.info("Setting up the guild store...");

		this.#guildCreateCollector.onCollect((guild) => this.#setupGuild(guild));
		this.#guildDeleteCollector.onCollect((guildId, _) => this.#teardownGuild({ guildId }));

		await this.#client.registerCollector("guildCreate", this.#guildCreateCollector);
		await this.#client.registerCollector("guildDelete", this.#guildDeleteCollector);

		this.log.info("Guild store set up.");
	}

	async teardown(): Promise<void> {
		this.log.info("Tearing down guild store...");

		await this.#guildReloadLock.dispose();

		this.#guildCreateCollector.close();
		this.#guildDeleteCollector.close();

		this.log.info("Guild store torn down.");
	}

	async #setupGuild(
		guild: Discord.Guild | Logos.Guild,
		{ isReload = false }: { isReload?: boolean } = {},
	): Promise<void> {
		if (!isReload) {
			// This check prevents the same guild being set up multiple times. This can happen when a shard managing a
			// given guild is closed and another shard is spun up, causing Discord to dispatch the `GUILD_CREATE` event
			// again for a guild that Logos would already have been managing.
			if (this.#client.documents.guilds.has(Model.buildPartialId<Guild>({ guildId: guild.id.toString() }))) {
				return;
			}

			this.log.info(`Setting Logos up on ${this.#client.diagnostics.guild(guild)}...`);

			this.log.info(`Fetching ~${guild.memberCount} members of ${this.#client.diagnostics.guild(guild)}...`);

			const members = await this.#client.bot.gateway
				.requestMembers(guild.id, { limit: 0, query: "", nonce: Date.now().toString() })
				.catch((error) => {
					this.log.warn(error, `Failed to fetch members of ${this.#client.diagnostics.guild(guild)}.`);
					return [];
				});
			for (const member of members) {
				this.#client.bot.transformers.member(
					this.#client.bot,
					member as unknown as Discord.DiscordMember,
					guild.id,
					member.user.id,
				);
			}

			this.log.info(`Fetched ~${guild.memberCount} members of ${this.#client.diagnostics.guild(guild)}.`);
		}

		const guildDocument = await Guild.getOrCreate(this.#client, { guildId: guild.id.toString() });
		await this.#services.startForGuild({ guildId: guild.id, guildDocument });
		await this.#commands.registerGuildCommands({ guildId: guild.id, guildDocument });
	}

	async #teardownGuild({ guildId }: { guildId: bigint }): Promise<void> {
		await this.#services.stopForGuild({ guildId });
		// We don't unregister guild commands: They'll be updated the next time the guild is set up anyway.
	}

	async reloadGuild(guildId: bigint): Promise<void> {
		await this.#guildReloadLock.doAction(() => this.#handleGuildReload(guildId));
	}

	async #handleGuildReload(guildId: bigint): Promise<void> {
		const guild = this.#client.entities.guilds.get(guildId);
		if (guild === undefined) {
			this.log.warn(`Tried to reload ${this.#client.diagnostics.guild(guildId)}, but it wasn't cached.`);
			return;
		}

		this.log.info(`Reloading ${this.#client.diagnostics.guild(guildId)}...`);

		await this.#teardownGuild({ guildId });
		await this.#setupGuild(guild, { isReload: true });

		this.log.info(`${this.#client.diagnostics.guild(guildId)} has been reloaded.`);
	}
}

export { GuildStore };