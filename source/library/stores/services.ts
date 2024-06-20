import type { Client } from "logos/client";
import { Logger } from "logos/logger";
import type { Guild } from "logos/models/guild";
import { AlertService } from "logos/services/alert";
import { DynamicVoiceChannelService } from "logos/services/dynamic-voice-channels";
import { EntryService } from "logos/services/entry";
import { InteractionRepetitionService } from "logos/services/interaction-repetition";
import { LavalinkService } from "logos/services/lavalink";
import { MusicService } from "logos/services/music";
import { InformationNoticeService } from "logos/services/notices/information";
import { ResourceNoticeService } from "logos/services/notices/resources";
import { RoleNoticeService } from "logos/services/notices/roles";
import type { NoticeService } from "logos/services/notices/service";
import { WelcomeNoticeService } from "logos/services/notices/welcome";
import { ReportPromptService } from "logos/services/prompts/reports";
import { ResourcePromptService } from "logos/services/prompts/resources";
import type { PromptService } from "logos/services/prompts/service";
import { SuggestionPromptService } from "logos/services/prompts/suggestions";
import { TicketPromptService } from "logos/services/prompts/tickets";
import { VerificationPromptService } from "logos/services/prompts/verification";
import { RealtimeUpdateService } from "logos/services/realtime-updates";
import { RoleIndicatorService } from "logos/services/role-indicators";
import type { Service } from "logos/services/service";
import { StatusService } from "logos/services/status";

class ServiceStore {
	readonly log: Logger;
	readonly global: {
		readonly lavalink?: LavalinkService;
		readonly interactionRepetition: InteractionRepetitionService;
		readonly realtimeUpdates: RealtimeUpdateService;
		readonly status: StatusService;
	};
	readonly local: {
		readonly alerts: Map<bigint, AlertService>;
		readonly dynamicVoiceChannels: Map<bigint, DynamicVoiceChannelService>;
		readonly entry: Map<bigint, EntryService>;
		readonly music: Map<bigint, MusicService>;
		readonly notices: {
			readonly information: Map<bigint, InformationNoticeService>;
			readonly resources: Map<bigint, ResourceNoticeService>;
			readonly roles: Map<bigint, RoleNoticeService>;
			readonly welcome: Map<bigint, WelcomeNoticeService>;
		};
		readonly prompts: {
			readonly reports: Map<bigint, ReportPromptService>;
			readonly resources: Map<bigint, ResourcePromptService>;
			readonly suggestions: Map<bigint, SuggestionPromptService>;
			readonly tickets: Map<bigint, TicketPromptService>;
			readonly verification: Map<bigint, VerificationPromptService>;
		};
		readonly roleIndicators: Map<bigint, RoleIndicatorService>;
	};

	readonly #collection: {
		/** Singular services running across all guilds. */
		readonly global: Service[];

		/** Particular services running under specific guilds. */
		readonly local: Map<bigint, Service[]>;
	};

	constructor(client: Client) {
		this.log = Logger.create({ identifier: "Client/ServiceStore", isDebug: client.environment.isDebug });

		const lavalinkService = LavalinkService.tryCreate(client);
		if (lavalinkService === undefined) {
			this.log.warn(
				"One or more of `LAVALINK_HOST`, `LAVALINK_PORT` or `LAVALINK_PASSWORD` have not been provided. Logos will not serve audio sessions.",
			);
		}

		this.global = {
			lavalink: lavalinkService,
			interactionRepetition: new InteractionRepetitionService(client),
			realtimeUpdates: new RealtimeUpdateService(client),
			status: new StatusService(client),
		};
		this.local = {
			alerts: new Map(),
			dynamicVoiceChannels: new Map(),
			entry: new Map(),
			music: new Map(),
			notices: {
				information: new Map(),
				resources: new Map(),
				roles: new Map(),
				welcome: new Map(),
			},
			prompts: {
				verification: new Map(),
				reports: new Map(),
				resources: new Map(),
				suggestions: new Map(),
				tickets: new Map(),
			},
			roleIndicators: new Map(),
		};

		this.#collection = { global: [], local: new Map() };
	}

	async setup(): Promise<void> {
		this.log.info("Setting up service store...");

		await this.#startGlobal();

		this.log.info("Service store set up.");
	}

	async teardown(): Promise<void> {
		this.log.info("Tearing down service store...");

		await this.#stopGlobal();

		this.log.info("Service store torn down.");
	}

	async #startGlobal(): Promise<void> {
		const services = Object.values(this.global);
		this.log.info(`Starting global services... (${services.length} services to start)`);

		const promises: (void | Promise<void>)[] = [];
		for (const service of services) {
			promises.push(service.start());
		}
		await Promise.all(promises);
		this.log.info("Global services started.");

		this.#collection.global.push(...services);
	}

	async #stopGlobal(): Promise<void> {
		this.log.info(`Stopping global services... (${this.#collection.local.size} services to stop)`);

		const promises: Promise<void>[] = [];
		for (const services of this.#collection.local.values()) {
			promises.push(this.#stopServices(services));
		}
		await Promise.all(promises);

		await this.#stopServices(this.#collection.global);

		this.log.info("Global services stopped.");
	}

	async setupGuildServices(
		client: Client,
		{ guildId, guildDocument }: { guildId: bigint; guildDocument: Guild },
	): Promise<void> {
		const services: Service[] = [];

		if (guildDocument.hasEnabled("informationFeatures")) {
			if (guildDocument.hasEnabled("noticeFeatures")) {
				if (guildDocument.hasEnabled("informationNotice")) {
					const service = new InformationNoticeService(client, { guildId });
					services.push(service);

					this.local.notices.information.set(guildId, service);
				}

				if (guildDocument.hasEnabled("resourceNotice")) {
					const service = new ResourceNoticeService(client, { guildId });
					services.push(service);

					this.local.notices.resources.set(guildId, service);
				}

				if (guildDocument.hasEnabled("roleNotice")) {
					const service = new RoleNoticeService(client, { guildId });
					services.push(service);

					this.local.notices.roles.set(guildId, service);
				}

				if (guildDocument.hasEnabled("welcomeNotice")) {
					const service = new WelcomeNoticeService(client, { guildId });
					services.push(service);

					this.local.notices.welcome.set(guildId, service);
				}
			}
		}

		if (guildDocument.hasEnabled("moderationFeatures")) {
			if (guildDocument.hasEnabled("alerts")) {
				const service = new AlertService(client, { guildId });
				services.push(service);

				this.local.alerts.set(guildId, service);
			}

			if (guildDocument.hasEnabled("reports")) {
				const service = new ReportPromptService(client, { guildId });
				services.push(service);

				this.local.prompts.reports.set(guildId, service);
			}

			if (guildDocument.hasEnabled("verification")) {
				const service = new VerificationPromptService(client, { guildId });
				services.push(service);

				this.local.prompts.verification.set(guildId, service);
			}
		}

		if (guildDocument.hasEnabled("serverFeatures")) {
			if (guildDocument.hasEnabled("dynamicVoiceChannels")) {
				const service = new DynamicVoiceChannelService(client, { guildId });
				services.push(service);

				this.local.dynamicVoiceChannels.set(guildId, service);
			}

			if (guildDocument.hasEnabled("entry")) {
				const service = new EntryService(client, { guildId });
				services.push(service);

				this.local.entry.set(guildId, service);
			}

			if (guildDocument.hasEnabled("roleIndicators")) {
				const service = new RoleIndicatorService(client, { guildId });
				services.push(service);

				this.local.roleIndicators.set(guildId, service);
			}

			if (guildDocument.hasEnabled("suggestions")) {
				const service = new SuggestionPromptService(client, { guildId });
				services.push(service);

				this.local.prompts.suggestions.set(guildId, service);
			}

			if (guildDocument.hasEnabled("tickets")) {
				const service = new TicketPromptService(client, { guildId });
				services.push(service);

				this.local.prompts.tickets.set(guildId, service);
			}

			if (guildDocument.hasEnabled("resourceSubmissions")) {
				const service = new ResourcePromptService(client, { guildId });
				services.push(service);

				this.local.prompts.resources.set(guildId, service);
			}
		}

		if (guildDocument.hasEnabled("socialFeatures")) {
			if (guildDocument.hasEnabled("music") && this.global.lavalink !== undefined) {
				const service = new MusicService(client, { guildId });
				services.push(service);

				this.local.music.set(guildId, service);
			}
		}

		await this.startLocal(client, { guildId, services });
	}

	async startLocal(client: Client, { guildId, services }: { guildId: bigint; services: Service[] }): Promise<void> {
		if (services.length === 0) {
			this.log.info(`There were no local services to start on ${client.diagnostics.guild(guildId)}.`);
			return;
		}

		this.log.info(
			`Starting local services on ${client.diagnostics.guild(guildId)}... (${services.length} services to start)`,
		);

		this.#collection.local.set(guildId, services);

		const promises: (void | Promise<void>)[] = [];
		for (const service of services) {
			promises.push(service.start());
		}
		await Promise.all(promises);

		this.log.info(`Local services on ${client.diagnostics.guild(guildId)} started.`);
	}

	async stopLocal(client: Client, { guildId }: { guildId: bigint }): Promise<void> {
		if (!this.#collection.local.has(guildId)) {
			this.log.info(`There were no local services to stop on ${client.diagnostics.guild(guildId)}.`);
			return;
		}

		const services = this.#collection.local.get(guildId)!;

		this.log.info(
			`Stopping services on ${client.diagnostics.guild(guildId)}... (${services.length} services to stop)`,
		);

		this.#collection.local.delete(guildId);

		await this.#stopServices(services);

		this.log.info(`Local services on ${client.diagnostics.guild(guildId)} stopped.`);
	}

	async #stopServices(services: Service[]): Promise<void> {
		const promises: Promise<void>[] = [];
		for (const service of services) {
			promises.push(Promise.resolve(service.stop()));
		}
		await Promise.all(promises);
	}

	getAlertService(guildId: bigint): AlertService | undefined {
		return this.local.alerts.get(guildId);
	}

	getDynamicVoiceChannelService(guildId: bigint): DynamicVoiceChannelService | undefined {
		return this.local.dynamicVoiceChannels.get(guildId);
	}

	getEntryService(guildId: bigint): EntryService | undefined {
		return this.local.entry.get(guildId);
	}

	getMusicService(guildId: bigint): MusicService | undefined {
		return this.local.music.get(guildId);
	}

	getRoleIndicatorService(guildId: bigint): RoleIndicatorService | undefined {
		return this.local.roleIndicators.get(guildId);
	}

	getNoticeService(guildId: bigint, { type }: { type: "information" }): InformationNoticeService | undefined;
	getNoticeService(guildId: bigint, { type }: { type: "resources" }): ResourceNoticeService | undefined;
	getNoticeService(guildId: bigint, { type }: { type: "roles" }): RoleNoticeService | undefined;
	getNoticeService(guildId: bigint, { type }: { type: "welcome" }): WelcomeNoticeService | undefined;
	getNoticeService(
		guildId: bigint,
		{ type }: { type: keyof ServiceStore["local"]["notices"] },
	): NoticeService<{ type: typeof type }> | undefined {
		switch (type) {
			case "information": {
				return this.local.notices.information.get(guildId);
			}
			case "resources": {
				return this.local.notices.resources.get(guildId);
			}
			case "roles": {
				return this.local.notices.roles.get(guildId);
			}
			case "welcome": {
				return this.local.notices.welcome.get(guildId);
			}
		}
	}

	getPromptService(guildId: bigint, { type }: { type: "verification" }): VerificationPromptService | undefined;
	getPromptService(guildId: bigint, { type }: { type: "reports" }): ReportPromptService | undefined;
	getPromptService(guildId: bigint, { type }: { type: "resources" }): ResourcePromptService | undefined;
	getPromptService(guildId: bigint, { type }: { type: "suggestions" }): SuggestionPromptService | undefined;
	getPromptService(guildId: bigint, { type }: { type: "tickets" }): TicketPromptService | undefined;
	getPromptService(
		guildId: bigint,
		{ type }: { type: keyof ServiceStore["local"]["prompts"] },
	): PromptService | undefined {
		switch (type) {
			case "verification": {
				return this.local.prompts.verification.get(guildId);
			}
			case "reports": {
				return this.local.prompts.reports.get(guildId);
			}
			case "resources": {
				return this.local.prompts.resources.get(guildId);
			}
			case "suggestions": {
				return this.local.prompts.suggestions.get(guildId);
			}
			case "tickets": {
				return this.local.prompts.tickets.get(guildId);
			}
		}
	}
}

export { ServiceStore };
