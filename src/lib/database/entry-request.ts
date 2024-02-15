import { Model } from "./model";

interface EntryRequestFormData {
	readonly reason: string;
	readonly aim: string;
	readonly whereFound: string;
}

type Vote = "for" | "against";

class EntryRequest extends Model<{ idParts: [guildId: string, userId: string] }> {
	static readonly collection = "EntryRequests";

	get guildId(): string {
		return this._idParts[0]!;
	}

	get authorId(): string {
		return this._idParts[1]!;
	}

	readonly requestedRoleId: string;
	// TODO(vxern): Rename to "formData".
	readonly answers: EntryRequestFormData;

	isFinalised: boolean;
	ticketChannelId?: string;
	// TODO(vxern): Store as an object "votes".
	votedFor?: string[];
	votedAgainst?: string[];

	constructor({
		id,
		createdAt,
		requestedRoleId,
		answers,
		isFinalised,
		ticketChannelId,
		votedFor,
		votedAgainst,
	}: {
		id: string;
		createdAt: number;
		requestedRoleId: string;
		isFinalised: boolean;
		answers: EntryRequestFormData;
		ticketChannelId?: string;
		votedFor?: string[];
		votedAgainst?: string[];
	}) {
		super({ id, createdAt });

		this.requestedRoleId = requestedRoleId;
		this.isFinalised = isFinalised;
		this.answers = answers;

		this.ticketChannelId = ticketChannelId;
		this.votedFor = votedFor;
		this.votedAgainst = votedAgainst;
	}

	getUserVote({ userId }: { userId: string }): Vote | undefined {
		if (this.votedFor?.includes(userId)) {
			return "for";
		}

		if (this.votedAgainst?.includes(userId)) {
			return "against";
		}

		return undefined;
	}

	addVote({ userId, vote }: { userId: string; vote: Vote }): void {
		const previousVote = this.getUserVote({ userId });
		if (previousVote !== undefined) {
			if (vote === previousVote) {
				return;
			}

			this.removeVote({ userId, vote: previousVote });
		}

		switch (vote) {
			case "for": {
				if (this.votedFor === undefined) {
					this.votedFor = [userId];
					return;
				}

				this.votedFor!.splice(this.votedFor!.indexOf(userId), 1);
				break;
			}
			case "against": {
				if (this.votedAgainst === undefined) {
					this.votedAgainst = [userId];
					return;
				}

				this.votedAgainst!.splice(this.votedAgainst!.indexOf(userId), 1);
				break;
			}
		}
	}

	removeVote({ userId, vote }: { userId: string; vote: Vote }): void {
		switch (vote) {
			case "for": {
				this.votedFor!.splice(this.votedFor!.indexOf(userId), 1);
				break;
			}
			case "against": {
				this.votedAgainst!.splice(this.votedAgainst!.indexOf(userId), 1);
				break;
			}
		}
	}
}

export { EntryRequest };
