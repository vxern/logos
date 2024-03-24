import { mockClient } from "logos:test/mocks";
import { expect } from "chai";
import { Cache } from "logos/cache";

describe("Cache", () => {
	describe("constructor()", () => {
		it("creates an object.", () => {
			expect(() => new Cache(mockClient)).to.not.throw;
		});
	});

	describe("start()", () => {
		it("opens a connection to Redis.", () => {
			// TODO(vxern): Test this.
		});
	});

	describe("stop()", () => {
		it("closes the connection to Redis.", () => {
			// TODO(vxern): Test this.
		});
	});
});
