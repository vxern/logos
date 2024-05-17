import { describe, it } from "bun:test";

describe("Collector", () => {
	describe("close()", () => {
		it("acts as an alias for dispatchDone().", () => {
			// TODO(vxern): Test.
		});
	});

	describe("initialise()", () => {
		it("initialises the collector.", () => {
			// TODO(vxern): Test.
		});
	});

	describe("filter()", () => {
		it("does not filter out any incoming events by default.", () => {
			// TODO(vxern): Test.
		});
	});

	describe("dispatchCollect()", () => {
		// TODO(vxern): Test.
	});

	describe("dispatchDone()", () => {
		// TODO(vxern): Test.
	});

	describe("onCollect()", () => {
		// TODO(vxern): Test.
	});

	describe("onDone()", () => {
		// TODO(vxern): Test.
	});
});

describe("InteractionCollector", () => {
	it("getCommandName()", () => {
		// TODO(vxern): Test.
	});

	it("encodeCustomId()", () => {
		// TODO(vxern): Test.
	});

	it("filter()", () => {
		// TODO(vxern): Test.
	});

	it("onCollect()", () => {
		// TODO(vxern): Test.
	});

	it("encodeId()", () => {
		// TODO(vxern): Test.
	});

	it("decodeId()", () => {
		// TODO(vxern): Test.
	});
});
