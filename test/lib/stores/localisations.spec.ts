import constants from "logos:constants/constants";
import { mockClient } from "logos:test/mocks";
import { expect } from "chai";
import { DescriptionLocalisations, LocalisationStore, NameLocalisations } from "logos/stores/localisations";

describe("LocalisationStore", () => {
	describe("constructor()", () => {
		it("creates an object.", () => {
			expect(() => new LocalisationStore(mockClient, { localisations: new Map() })).to.not.throw;
		});
	});

	describe("getOptionName()", () => {
		it("gets the name from an option string key.", () => {
			const instance = new LocalisationStore(mockClient, { localisations: new Map() });
			expect(instance.getOptionName({ key: "command" })).to.equal("command");
			expect(instance.getOptionName({ key: "command.options.option" })).to.equal("option");
		});
	});

	describe("getNameLocalisations()", () => {
		it("returns undefined if a base (English) localisation for a given option name is not registered.", () => {
			const instance = new LocalisationStore(mockClient, { localisations: new Map() });
			expect(instance.buildNameLocalisations({ key: "inexistent" })).to.be.undefined;
		});

		it("given an option string key, builds a `NameLocalisations` object for the option's name.", () => {
			const instance = new LocalisationStore(mockClient, {
				localisations: new Map([
					[
						"command.options.option.name",
						new Map([
							["English/American", "example"],
							["Polish", "przykład"],
							["Romanian", "exemplu"],
						]),
					],
				]),
			});
			expect(instance.buildNameLocalisations({ key: "command.options.option" })).to.deep.equal({
				name: "example",
				nameLocalizations: {
					"en-US": "example",
					pl: "przykład",
					ro: "exemplu",
				},
			} satisfies NameLocalisations);
		});

		it("treats the option name as a parameter name if no standalone option counterpart exists.", () => {
			const instance = new LocalisationStore(mockClient, {
				localisations: new Map([
					[
						"parameters.option.name",
						new Map([
							["English/American", "example"],
							["Polish", "przykład"],
							["Romanian", "exemplu"],
						]),
					],
				]),
			});
			expect(instance.buildNameLocalisations({ key: "option" })).to.deep.equal({
				name: "example",
				nameLocalizations: {
					"en-US": "example",
					pl: "przykład",
					ro: "exemplu",
				},
			} satisfies NameLocalisations);
		});
	});

	describe("getDescriptionLocalisations()", () => {
		it("returns undefined if a base (English) localisation for a given option description is not registered.", () => {
			const instance = new LocalisationStore(mockClient, { localisations: new Map() });
			expect(instance.buildDescriptionLocalisations({ key: "inexistent" })).to.be.undefined;
		});

		it("given an option string key, builds a `DescriptionLocalisations` object for the option's description.", () => {
			const instance = new LocalisationStore(mockClient, {
				localisations: new Map([
					[
						"command.options.option.description",
						new Map([
							["English/American", "This is a sample description."],
							["Polish", "To jest przykładowy opis."],
							["Romanian", "Aceasta este un exemplu de o descriere."],
						]),
					],
				]),
			});
			expect(instance.buildDescriptionLocalisations({ key: "command.options.option" })).to.deep.equal({
				description: "This is a sample description.",
				descriptionLocalizations: {
					"en-US": "This is a sample description.",
					pl: "To jest przykładowy opis.",
					ro: "Aceasta este un exemplu de o descriere.",
				},
			} satisfies DescriptionLocalisations);
		});

		it("treats the option description as a parameter description if no standalone option counterpart exists.", () => {
			const instance = new LocalisationStore(mockClient, {
				localisations: new Map([
					[
						"parameters.option.description",
						new Map([
							["English/American", "This is a sample description."],
							["Polish", "To jest przykładowy opis."],
							["Romanian", "Aceasta este un exemplu de o descriere."],
						]),
					],
				]),
			});
			expect(instance.buildDescriptionLocalisations({ key: "option" })).to.deep.equal({
				description: "This is a sample description.",
				descriptionLocalizations: {
					"en-US": "This is a sample description.",
					pl: "To jest przykładowy opis.",
					ro: "Aceasta este un exemplu de o descriere.",
				},
			} satisfies DescriptionLocalisations);
		});
	});

	describe("has()", () => {
		it("returns true if a string key is registered.", () => {
			const instance = new LocalisationStore(mockClient, {
				localisations: new Map([["command.name", new Map()]]),
			});
			expect(instance.has("command.name")).to.be.true;
		});

		it("returns false if a string key is not registered.", () => {
			const instance = new LocalisationStore(mockClient, { localisations: new Map() });
			expect(instance.has("inexistent")).to.be.false;
		});
	});

	describe("localise()", () => {
		it("returns a localisation builder.", () => {
			const instance = new LocalisationStore(mockClient, { localisations: new Map() });
			expect(instance.localise("key")).to.be.a("function");
		});

		it("resolves to a missing string when the string key does not exist.", () => {
			const instance = new LocalisationStore(mockClient, { localisations: new Map() });
			expect(instance.localise("inexistent")()).to.equal(constants.special.missingString);
		});

		it("resolves to a missing string when the string is not localised to the target language or the default language.", () => {
			const instance = new LocalisationStore(mockClient, { localisations: new Map([["key", new Map()]]) });
			expect(instance.localise("key")()).to.equal(constants.special.missingString);
		});

		it("resolves to the localisation for the passed locale.", () => {
			const instance = new LocalisationStore(mockClient, {
				localisations: new Map([["key", new Map([["Polish", "To jest przykładowe tłumaczenie."]])]]),
			});
			expect(instance.localise("key", "pol")()).to.equal("To jest przykładowe tłumaczenie.");
		});

		it("resolves to the localisation for the default language if one isn't available for the default.", () => {
			const instance = new LocalisationStore(mockClient, {
				localisations: new Map([["key", new Map([["English/American", "This is a sample localisation."]])]]),
			});
			expect(instance.localise("key", "pol")()).to.equal("This is a sample localisation.");
		});
	});

	describe("pluralise()", () => {
		// TODO(vxern): Add tests.
	});
});
