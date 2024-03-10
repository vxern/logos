import { expect } from "chai";
import { ServiceStore } from "../../src/lib/services";
import { mockClient } from "../mocks";

describe("ServiceStore", () => {
	describe("constructor()", () => {
		it("creates an object.", () => {
			expect(() => new ServiceStore(mockClient)).to.not.throw;
		});
	});

	describe("start()", () => {
		it("starts global services and registers them in the global service collection.", () => {
			// TODO(vxern): Implement.
		});
	});

	describe("stop()", () => {
		it("stops all local and global services.", () => {
			// TODO(vxern): Implement.
		});
	});

	describe("startLocal()", () => {
		// TODO(vxern): Add tests.
	});

	describe("stopLocal()", () => {
		// TODO(vxern): Add tests.
	});

	describe("dispatchToGlobal()", () => {
		// TODO(vxern): Add tests.
	});

	describe("dispatchEvent()", () => {
		// TODO(vxern): Add tests.
	});

	describe("getAlertService()", () => {
		// TODO(vxern): Add tests.
	});

	describe("getDynamicVoiceChannelService()", () => {
		// TODO(vxern): Add tests.
	});

	describe("getEntryService()", () => {
		// TODO(vxern): Add tests.
	});

	describe("getMusicService()", () => {
		// TODO(vxern): Add tests.
	});

	describe("getRoleIndicatorService()", () => {
		// TODO(vxern): Add tests.
	});

	describe("getNoticeService()", () => {
		// TODO(vxern): Add tests.
	});

	describe("getPromptService()", () => {
		// TODO(vxern): Add tests.
	});
});
