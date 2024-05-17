import { describe, it } from "bun:test";
import { expect } from "chai";
import { Logger } from "logos/logger";

describe("Logger", () => {
	describe("create()", () => {
		it("creates an object.", () => {
			expect(() => Logger.create({ identifier: "Sample", isDebug: false })).to.not.throw;
		});

		it("should return a singleton object tied to the passed identifier.", () => {
			const IDENTIFIER = "Sample";

			const one = Logger.create({ identifier: IDENTIFIER, isDebug: false });
			const two = Logger.create({ identifier: IDENTIFIER, isDebug: false });
			expect(one).to.equal(two);
		});
	});

	describe("debug()", () => {
		it("should not do anything when the `isDebug` flag is false.", () => {
			// TODO(vxern): Implement.
		});

		it("should delegate to the `debug()` method on loglevel.", () => {
			// TODO(vxern): Implement.
		});
	});

	describe("info()", () => {
		it("should delegate to the `info()` method on loglevel.", () => {
			// TODO(vxern): Implement.
		});
	});

	describe("warn()", () => {
		it("should delegate to the `warn()` method on loglevel.", () => {
			// TODO(vxern): Implement.
		});
	});

	describe("error()", () => {
		it("should delegate to the `error()` method on loglevel.", () => {
			// TODO(vxern): Implement.
		});
	});
});
