import statuses from "logos:constants/statuses";
import { expect } from "chai";

const DISCORD_COMMAND_PATTERN = /^\/[-_a-zA-Z]{1,32}$/;

describe("The statuses object", () => {
	it("is immutable.", () => {
		expect(Object.isFrozen(statuses)).to.be.true;
	});

	it("contains valid command names.", () => {
		for (const command of statuses) {
			expect(command).to.match(DISCORD_COMMAND_PATTERN);
		}
	});
});
