import { Client, Environment } from "logos/client";
import { ServiceStore } from "logos/stores/services";

const mockEnvironment: Environment = {
	isDebug: false,
	discordSecret: "MTIxNjQ2Njk1NjQ1OTE4NDE0OA.GAQb1m.RnwgsOMPEKyOm7QF5NPkIaq4X93bTL6rV-KrsU",
	deeplSecret: "DEEPL_SECRET",
	rapidApiSecret: "SECRET_RAPID_API",
	ravendbDatabase: "logos",
	ravendbPort: "8080",
	ravendbHost: "http://127.0.0.1",
	ravendbSecure: false,
	redisHost: "http://127.0.0.1",
	redisPort: "6379",
	redisPassword: "",
	lavalinkHost: "127.0.0.1",
	lavalinkPassword: "password123",
	lavalinkPort: "7031",
};
const mockClient = await Client.create({ environment: mockEnvironment, localisations: new Map() });

// TODO(vxern): Implement.
const mockBot = {} as Discord.Bot;

// TODO(vxern): Implement.
const mockServices = {} as ServiceStore;

// TODO(vxern): Implement.
const mockEventHandlers = {} as Partial<Discord.EventHandlers>;

export { mockBot, mockClient, mockEnvironment, mockEventHandlers, mockServices };
