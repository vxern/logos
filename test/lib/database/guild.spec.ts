import { TimeUnit } from "logos:constants/time";
import { expect } from "chai";
import { Guild, timeStructToMilliseconds } from "logos/database/guild";

describe("Guild", () => {
	describe("guildId()", () => {
		it("returns the ID of the guild the document is for.", () => {
			const model = new Guild({ guildId: `${123}` });
			expect(model.guildId).to.equal(`${123}`);
		});
	});

	describe("localisationLanguage()", () => {
		it("returns the configured localisation language.", () => {
			const model = new Guild({ guildId: `${123}`, languages: { localisation: "Polish" } });
			expect(model.localisationLanguage).to.equal("Polish");
		});

		it("returns the default localisation language if a custom localisation language is not configured.", () => {
			const model = new Guild({ guildId: `${123}` });
			expect(model.localisationLanguage).to.equal(constants.defaults.LOCALISATION_LANGUAGE);
		});
	});

	describe("targetLanguage()", () => {
		it("returns the configured target language.", () => {
			const model = new Guild({ guildId: `${123}`, languages: { target: "Romanian" } });
			expect(model.targetLanguage).to.equal("Romanian");
		});

		it("returns the localisation language if a custom target language is not configured.", () => {
			const model = new Guild({ guildId: `${123}` });
			expect(model.targetLanguage).to.equal(model.localisationLanguage);
		});
	});

	describe("featureLanguage()", () => {
		it("returns the configured feature language.", () => {
			const model = new Guild({ guildId: `${123}`, languages: { feature: "Hungarian" } });
			expect(model.featureLanguage).to.equal("Hungarian");
		});

		it("returns the default feature language if a custom feature language is not configured.", () => {
			const model = new Guild({ guildId: `${123}` });
			expect(model.featureLanguage).to.equal(constants.defaults.FEATURE_LANGUAGE);
		});
	});

	describe("informationFeatures()", () => {
		// TODO(vxern): Add tests.
	});

	describe("journalling()", () => {
		// TODO(vxern): Add tests.
	});

	describe("noticeFeatures()", () => {
		// TODO(vxern): Add tests.
	});

	describe("informationNotice()", () => {
		// TODO(vxern): Add tests.
	});

	describe("resourceNotice()", () => {
		// TODO(vxern): Add tests.
	});

	describe("roleNotice()", () => {
		// TODO(vxern): Add tests.
	});

	describe("welcomeNotice()", () => {
		// TODO(vxern): Add tests.
	});

	describe("languageFeatures()", () => {
		// TODO(vxern): Add tests.
	});

	describe("answers()", () => {
		// TODO(vxern): Add tests.
	});

	describe("corrections()", () => {
		// TODO(vxern): Add tests.
	});

	describe("cefr()", () => {
		// TODO(vxern): Add tests.
	});

	describe("game()", () => {
		// TODO(vxern): Add tests.
	});

	describe("resources()", () => {
		// TODO(vxern): Add tests.
	});

	describe("translate()", () => {
		// TODO(vxern): Add tests.
	});

	describe("word()", () => {
		// TODO(vxern): Add tests.
	});

	describe("targetOnly()", () => {
		// TODO(vxern): Add tests.
	});

	describe("roleLanguages()", () => {
		// TODO(vxern): Add tests.
	});

	describe("moderationFeatures()", () => {
		// TODO(vxern): Add tests.
	});

	describe("alerts()", () => {
		// TODO(vxern): Add tests.
	});

	describe("policy()", () => {
		// TODO(vxern): Add tests.
	});

	describe("rules()", () => {
		// TODO(vxern): Add tests.
	});

	describe("purging()", () => {
		// TODO(vxern): Add tests.
	});

	describe("slowmode()", () => {
		// TODO(vxern): Add tests.
	});

	describe("timeouts()", () => {
		// TODO(vxern): Add tests.
	});

	describe("warns()", () => {
		// TODO(vxern): Add tests.
	});

	describe("reports()", () => {
		// TODO(vxern): Add tests.
	});

	describe("verification()", () => {
		// TODO(vxern): Add tests.
	});

	describe("serverFeatures()", () => {
		// TODO(vxern): Add tests.
	});

	describe("dynamicVoiceChannels()", () => {
		// TODO(vxern): Add tests.
	});

	describe("entry()", () => {
		// TODO(vxern): Add tests.
	});

	describe("roleIndicators()", () => {
		// TODO(vxern): Add tests.
	});

	describe("suggestions()", () => {
		// TODO(vxern): Add tests.
	});

	describe("resourceSubmissions()", () => {
		// TODO(vxern): Add tests.
	});

	describe("tickets()", () => {
		// TODO(vxern): Add tests.
	});

	describe("socialFeatures()", () => {
		// TODO(vxern): Add tests.
	});

	describe("music()", () => {
		// TODO(vxern): Add tests.
	});

	describe("praises()", () => {
		// TODO(vxern): Add tests.
	});

	describe("profile()", () => {
		// TODO(vxern): Add tests.
	});

	describe("areEnabled()", () => {
		// TODO(vxern): Add tests.
	});

	describe("constructor()", () => {
		it("creates an object.", () => {
			expect(() => new Guild({ guildId: `${123}` })).to.not.throw;
		});
	});

	describe("get()", () => {
		// TODO(vxern): Add tests.
	});

	describe("getOrCreate()", () => {
		// TODO(vxern): Add tests.
	});

	describe("isEnabled()", () => {
		it("returns true when the specified feature is enabled.", () => {
			const model = new Guild({
				guildId: `${123}`,
				features: { information: { enabled: true, features: { journaling: { enabled: true, channelId: `${123}` } } } },
			});
			expect(model.isEnabled("journalling")).to.be.true;
		});

		it("returns false when the specified feature is not configured.", () => {
			const model = new Guild({ guildId: `${123}` });
			expect(model.isEnabled("journalling")).to.be.false;
		});

		it("returns false when the specified feature is disabled.", () => {
			const model = new Guild({
				guildId: `${123}`,
				features: { information: { enabled: true, features: { journaling: { enabled: false } } } },
			});
			expect(model.isEnabled("journalling")).to.be.false;
		});
	});

	describe("isTargetLanguageOnly()", () => {
		it("returns true when target-only channels are configured and the passed channel ID is defined as one.", () => {
			const model = new Guild({
				guildId: `${123}`,
				features: { language: { enabled: true, features: { targetOnly: { enabled: true, channelIds: [`${456}`] } } } },
			});
			expect(model.isTargetLanguageOnly(`${456}`)).to.be.true;
		});

		it("returns false when target-only channels are not configured or the passed channel ID is not defined as one.", () => {
			const model = new Guild({ guildId: `${123}` });
			expect(model.isTargetLanguageOnly(`${456}`)).to.be.false;
		});
	});
});

describe("timeStructToMilliseconds", () => {
	it("gets the number of milliseconds the time struct represents.", () => {
		for (const [unit, duration] of Object.entries(constants.time) as [TimeUnit, number][]) {
			expect(timeStructToMilliseconds([1, unit])).to.equal(duration);
		}

		// Verify the quantity is taken into account.
		expect(timeStructToMilliseconds([10, "second"])).to.equal(10 * constants.time.second);
	});
});
