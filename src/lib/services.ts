import { Client } from "./client";
import { Guild } from "./database/guild";
import { Logger } from "./logger";
import { AlertService } from "./services/alert";
import { DynamicVoiceChannelService } from "./services/dynamic-voice-channels";
import { EntryService } from "./services/entry";
import { InteractionRepetitionService } from "./services/interaction-repetition";
import { LavalinkService } from "./services/lavalink";
import { MusicService } from "./services/music";
import { InformationNoticeService } from "./services/notices/information";
import { ResourceNoticeService } from "./services/notices/resources";
import { RoleNoticeService } from "./services/notices/roles";
import { NoticeService } from "./services/notices/service";
import { WelcomeNoticeService } from "./services/notices/welcome";
import { ReportPromptService } from "./services/prompts/reports";
import { ResourcePromptService } from "./services/prompts/resources";
import { PromptService } from "./services/prompts/service";
import { SuggestionPromptService } from "./services/prompts/suggestions";
import { TicketPromptService } from "./services/prompts/tickets";
import { VerificationPromptService } from "./services/prompts/verification";
import { RealtimeUpdateService } from "./services/realtime-updates";
import { RoleIndicatorService } from "./services/role-indicators";
import { Service } from "./services/service";
import { StatusService } from "./services/status";

class ServiceStore {
	readonly global: {
		readonly lavalink: LavalinkService;
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

	readonly #log: Logger;
	readonly #collection: {
		/** Singular services running across all guilds. */
		readonly global: Service[];

		/** Particular services running under specific guilds. */
		readonly local: Map<bigint, Service[]>;
	};

	constructor(client: Client) {
		this.global = {
			lavalink: new LavalinkService(client),
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

		this.#log = Logger.create({ identifier: "Client/ServiceStore", isDebug: client.environment.isDebug });
		this.#collection = { global: [], local: new Map() };
	}

	async start(): Promise<void> {
		this.#log.info("Starting global services...");

		const services = Object.values(this.global);

		const promises = [];
		for (const service of services) {
			promises.push(service.start());
		}
		await Promise.all(promises);

		this.#collection.global.push(...services);
	}

	async stop(): Promise<void> {
		this.#log.info("Stopping services...");

		const promises: Promise<void>[] = [];
		for (const services of this.#collection.local.values()) {
			promises.push(this.#stopServices(services));
		}
		await Promise.all(promises);

		await this.#stopServices(this.#collection.global);
	}

	async startLocal(
		client: Client,
		{ guildId, guildDocument }: { guildId: bigint; guildDocument: Guild },
	): Promise<void> {
		const services: Service[] = [];

		if (guildDocument.areEnabled("informationFeatures")) {
			if (guildDocument.areEnabled("noticeFeatures")) {
				if (guildDocument.isEnabled("informationNotice")) {
					const service = new InformationNoticeService(client, { guildId });
					services.push(service);

					this.local.notices.information.set(guildId, service);
				}

				if (guildDocument.isEnabled("resourceNotice")) {
					const service = new ResourceNoticeService(client, { guildId });
					services.push(service);

					this.local.notices.resources.set(guildId, service);
				}

				if (guildDocument.isEnabled("roleNotice")) {
					const service = new RoleNoticeService(client, { guildId });
					services.push(service);

					this.local.notices.roles.set(guildId, service);
				}

				if (guildDocument.isEnabled("welcomeNotice")) {
					const service = new WelcomeNoticeService(client, { guildId });
					services.push(service);

					this.local.notices.welcome.set(guildId, service);
				}
			}
		}

		if (guildDocument.areEnabled("moderationFeatures")) {
			if (guildDocument.areEnabled("alerts")) {
				const service = new AlertService(client, { guildId });
				services.push(service);

				this.local.alerts.set(guildId, service);
			}

			if (guildDocument.areEnabled("reports")) {
				const service = new ReportPromptService(client, { guildId });
				services.push(service);

				this.local.prompts.reports.set(guildId, service);
			}

			if (guildDocument.isEnabled("verification")) {
				const service = new VerificationPromptService(client, { guildId });
				services.push(service);

				this.local.prompts.verification.set(guildId, service);
			}
		}

		if (guildDocument.areEnabled("serverFeatures")) {
			if (guildDocument.areEnabled("dynamicVoiceChannels")) {
				const service = new DynamicVoiceChannelService(client, { guildId });
				services.push(service);

				this.local.dynamicVoiceChannels.set(guildId, service);
			}

			if (guildDocument.isEnabled("entry")) {
				const service = new EntryService(client, { guildId });
				services.push(service);

				this.local.entry.set(guildId, service);
			}

			if (guildDocument.areEnabled("roleIndicators")) {
				const service = new RoleIndicatorService(client, { guildId });
				services.push(service);

				this.local.roleIndicators.set(guildId, service);
			}

			if (guildDocument.areEnabled("suggestions")) {
				const service = new SuggestionPromptService(client, { guildId });
				services.push(service);

				this.local.prompts.suggestions.set(guildId, service);
			}

			if (guildDocument.areEnabled("tickets")) {
				const service = new TicketPromptService(client, { guildId });
				services.push(service);

				this.local.prompts.tickets.set(guildId, service);
			}

			if (guildDocument.areEnabled("resources")) {
				const service = new ResourcePromptService(client, { guildId });
				services.push(service);

				this.local.prompts.resources.set(guildId, service);
			}
		}

		if (guildDocument.areEnabled("socialFeatures")) {
			if (guildDocument.isEnabled("music")) {
				const service = new MusicService(client, { guildId });
				services.push(service);

				this.local.music.set(guildId, service);
			}
		}

		this.#collection.local.set(guildId, services);

		const promises = [];
		for (const service of services) {
			promises.push(service.start());
		}
		await Promise.all(promises);
	}

	async stopLocal(guildId: bigint): Promise<void> {
		if (!this.#collection.local.has(guildId)) {
			return;
		}

		const services = this.#collection.local.get(guildId)!;

		this.#collection.local.delete(guildId);

		await this.#stopServices(services);
	}

	async #stopServices(services: Service[]): Promise<void> {
		const promises: Promise<void>[] = [];
		for (const service of services) {
			promises.push(service.stop());
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
