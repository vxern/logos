import * as Discord from "@discordeno/bot";
import constants from "../../../constants/constants";
import defaults from "../../../defaults";
import { Client } from "../../client";
import { GlobalService } from "../service";

class StatusService extends GlobalService {
	isActive: boolean;
	currentIndex: number;

	constructor([client, bot]: [Client, Discord.Bot]) {
		super([client, bot]);
		this.isActive = true;
		this.currentIndex = 0;
	}

	get status(): string | undefined {
		return constants.statuses[this.currentIndex];
	}

	async start(): Promise<void> {
		if (constants.statuses.length === 0) {
			return;
		}

		this.cycleStatus();
	}

	async stop(): Promise<void> {
		this.isActive = false;
		this.currentIndex = 0;
	}

	private cycleStatus(): void {
		const status = this.status;
		if (status === undefined) {
			this.currentIndex = 0;
			this.cycleStatus();
			return;
		}

		if (this.currentIndex === constants.statuses.length - 1) {
			this.currentIndex = 0;
		} else {
			this.currentIndex++;
		}

		this.bot.gateway
			.editBotStatus({
				activities: [
					{
						name: status,
						type: Discord.ActivityTypes.Streaming,
					},
				],
				status: "online",
			})
			.catch(() => {
				this.client.log.warn("Unable to edit bot status.");
			});

		setTimeout(() => this.cycleStatus(), defaults.STATUS_CYCLE);
	}
}

export { StatusService };
