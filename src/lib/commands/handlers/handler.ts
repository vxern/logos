import { Client } from "logos/client";

type InteractionHandler = (
	client: Client,
	interaction: Logos.Interaction,
	localeData: Logos.InteractionLocaleData,
) => Promise<void>;

export type { InteractionHandler };
