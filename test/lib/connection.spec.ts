import { expect } from "chai";
import { DiscordConnection } from "../../src/lib/connection";
import { mockClient, mockBot, mockEventHandlers } from "../mocks";

describe("DiscordConnection", () => {
	describe("constructor()", () => {
		it("creates an object.", () => {
			expect(() => new DiscordConnection(mockClient, { bot: mockBot, events: mockEventHandlers })).to.not.throw;
		});
	});

	describe("open()", () => {
		// TODO(vxern): Add tests.
	});

	describe("close()", () => {
		// TODO(vxern): Add tests.
	});
});
