import statuses from "../../src/constants/statuses";

// https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-naming
const DISCORD_COMMAND = /^\/[-_\p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]{1,32}$/;

describe("The statuses object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(statuses)).toBe(true);
	});

	it("contains valid command names.", () => {
		for (const command of statuses) {
			expect(command).toMatch(DISCORD_COMMAND);
		}
	});
});
