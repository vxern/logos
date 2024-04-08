import { Client } from "logos/client";
import { Resource } from "logos/database/resource";
import { EventLogger } from "logos/stores/journalling/logger";

class ResourceSendEventLogger extends EventLogger<"resourceSend"> {
	constructor(client: Client) {
		super(client, {
			title: `${constants.emojis.events.resource} Resource submitted`,
			colour: constants.colours.darkGreen,
		});
	}

	buildMessage(member: Logos.Member, resource: Resource): string | undefined {
		const memberUser = this.client.entities.users.get(member.id);
		if (memberUser === undefined) {
			return undefined;
		}

		return `${this.client.diagnostics.user(memberUser)} has submitted a resource.\n\nResource: *${
			resource.formData.resource
		}*`;
	}
}

export { ResourceSendEventLogger };
