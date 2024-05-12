import { mockEnvironment } from "logos:test/mocks";
import { expect } from "chai";
import { VolatileStore } from "logos/stores/volatile";

describe("VolatileStore", () => {
	describe("constructor()", () => {
		it("creates an object.", () => {
			expect(() => VolatileStore.tryCreate(mockEnvironment)).to.not.throw;
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
