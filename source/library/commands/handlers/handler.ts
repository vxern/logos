import type { Client } from "logos/client";

type InteractionHandler = (client: Client, interaction: Logos.Interaction) => Promise<void>;

export type { InteractionHandler };
