import { mockBot, mockClient, mockEventHandlers } from "logos:test/mocks";
import { expect } from "chai";
import { DiscordConnection } from "logos/connection";

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
