import { Client, Environment } from "../src/lib/client";

const mockEnvironment: Environment = {
	deeplSecret: "DEEPL_SECRET",
	discordSecret: "MTIxNjQ2Njk1NjQ1OTE4NDE0OA.GAQb1m.RnwgsOMPEKyOm7QF5NPkIaq4X93bTL6rV-KrsU",
	isDebug: false,
	lavalinkHost: "127.0.0.1",
	lavalinkPassword: "password123",
	lavalinkPort: "7031",
	rapidApiSecret: "SECRET_RAPID_API",
	ravendbDatabase: "logos",
	ravendbHost: "http://127.0.0.1",
	ravendbSecure: false,
};
const mockClient = await Client.create({ environment: mockEnvironment, localisations: new Map() });

export { mockEnvironment, mockClient };
