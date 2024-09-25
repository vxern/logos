import { describe, it } from "bun:test";
import constants from "logos:constants/constants";
import { expect } from "chai";
import { type DescriptionLocalisations, LocalisationStore, type NameLocalisations } from "logos/stores/localisations";

describe("LocalisationStore", () => {
	describe("getOptionName()", () => {
		it("gets the name from an option string key.", () => {
			const instance = new LocalisationStore({ localisations: new Map() });
			expect(instance.getOptionName({ key: "command" })).to.equal("command");
			expect(instance.getOptionName({ key: "command.options.option" })).to.equal("option");
		});
	});

	describe("getNameLocalisations()", () => {
		it("returns undefined if a base (English) localisation for a given option name is not registered.", () => {
			const instance = new LocalisationStore({ localisations: new Map() });
			expect(instance.buildNameLocalisations({ key: "inexistent" })).to.be.undefined;
		});

		it("given an option string key, builds a `NameLocalisations` object for the option's name.", () => {
			const instance = new LocalisationStore({
				localisations: new Map([
					[
						"command.options.option.name",
						new Map([
							["English/British", "example"],
							["Polish", "przykład"],
							["Romanian", "exemplu"],
						]),
					],
				]),
			});
			expect(instance.buildNameLocalisations({ key: "command.options.option" })).to.deep.equal({
				name: "example",
				nameLocalizations: {
					"en-GB": "example",
					pl: "przykład",
					ro: "exemplu",
				},
			} satisfies NameLocalisations);
		});

		it("treats the option name as a parameter name if no standalone option counterpart exists.", () => {
			const instance = new LocalisationStore({
				localisations: new Map([
					[
						"parameters.option.name",
						new Map([
							["English/British", "example"],
							["Polish", "przykład"],
							["Romanian", "exemplu"],
						]),
					],
				]),
			});
			expect(instance.buildNameLocalisations({ key: "option" })).to.deep.equal({
				name: "example",
				nameLocalizations: {
					"en-GB": "example",
					pl: "przykład",
					ro: "exemplu",
				},
			} satisfies NameLocalisations);
		});
	});

	describe("getDescriptionLocalisations()", () => {
		it("returns undefined if a base (English) localisation for a given option description is not registered.", () => {
			const instance = new LocalisationStore({ localisations: new Map() });
			expect(instance.buildDescriptionLocalisations({ key: "inexistent" })).to.be.undefined;
		});

		it("given an option string key, builds a `DescriptionLocalisations` object for the option's description.", () => {
			const instance = new LocalisationStore({
				localisations: new Map([
					[
						"command.options.option.description",
						new Map([
							["English/British", "This is a sample description."],
							["Polish", "To jest przykładowy opis."],
							["Romanian", "Aceasta este un exemplu de o descriere."],
						]),
					],
				]),
			});
			expect(instance.buildDescriptionLocalisations({ key: "command.options.option" })).to.deep.equal({
				description: "This is a sample description.",
				descriptionLocalizations: {
					"en-GB": "This is a sample description.",
					pl: "To jest przykładowy opis.",
					ro: "Aceasta este un exemplu de o descriere.",
				},
			} satisfies DescriptionLocalisations);
		});

		it("treats the option description as a parameter description if no standalone option counterpart exists.", () => {
			const instance = new LocalisationStore({
				localisations: new Map([
					[
						"parameters.option.description",
						new Map([
							["English/British", "This is a sample description."],
							["Polish", "To jest przykładowy opis."],
							["Romanian", "Aceasta este un exemplu de o descriere."],
						]),
					],
				]),
			});
			expect(instance.buildDescriptionLocalisations({ key: "option" })).to.deep.equal({
				description: "This is a sample description.",
				descriptionLocalizations: {
					"en-GB": "This is a sample description.",
					pl: "To jest przykładowy opis.",
					ro: "Aceasta este un exemplu de o descriere.",
				},
			} satisfies DescriptionLocalisations);
		});
	});

	describe("has()", () => {
		it("returns true if a string key is registered.", () => {
			const instance = new LocalisationStore({ localisations: new Map([["command.name", new Map()]]) });
			expect(instance.has("command.name")).to.be.true;
		});

		it("returns false if a string key is not registered.", () => {
			const instance = new LocalisationStore({ localisations: new Map() });
			expect(instance.has("inexistent")).to.be.false;
		});
	});

	describe("localise()", () => {
		it("returns a localisation builder.", () => {
			const instance = new LocalisationStore({ localisations: new Map() });
			expect(instance.localise("key")).to.be.a("function");
		});

		it("resolves to a missing string when the string key does not exist.", () => {
			const instance = new LocalisationStore({ localisations: new Map() });
			expect(instance.localise("inexistent")()).to.equal(constants.special.missingString);
		});

		it("resolves to a missing string when the string is not localised to the target language or the default language.", () => {
			const instance = new LocalisationStore({ localisations: new Map([["key", new Map()]]) });
			expect(instance.localise("key")()).to.equal(constants.special.missingString);
		});

		it("resolves to the localisation for the passed locale.", () => {
			const instance = new LocalisationStore({
				localisations: new Map([["key", new Map([["Polish", "To jest przykładowe tłumaczenie."]])]]),
			});
			expect(instance.localise("key", "pol")()).to.equal("To jest przykładowe tłumaczenie.");
		});

		it("resolves to the localisation for the default language if one isn't available for the default.", () => {
			const instance = new LocalisationStore({
				localisations: new Map([["key", new Map([["English/British", "This is a sample localisation."]])]]),
			});
			expect(instance.localise("key", "pol")()).to.equal("This is a sample localisation.");
		});

		it("replaces the passed template parameters with their corresponding values.", () => {
			const instance = new LocalisationStore({
				localisations: new Map([
					["key", new Map([["English/British", "Hi, I'm {name}, I'm from {country}, I'm {age} years old."]])],
				]),
			});
			const string = instance.localise("key", "eng-GB");
			expect(
				string({ name: "vxern", country: "Poland", age: 20 }),
				"Hi, I'm vxern, I'm from Poland, I'm 20 years old.",
			);
		});

		it("does not replace template parameters that weren't passed in.", () => {
			const instance = new LocalisationStore({
				localisations: new Map([
					["key", new Map([["English/British", "Hi, I'm {name}, I'm from {country}, I'm {age} years old."]])],
				]),
			});
			const string = instance.localise("key", "eng-GB");
			expect(string(), "Hi, I'm {name}, I'm from {country}, I'm {age} years old.");
		});
	});

	describe("localiseCommand()", () => {
		it("returns the correct localised string of the full command signature.", () => {
			const instance = new LocalisationStore({
				localisations: new Map([
					["command.name", new Map([["English/British", "command"]])],
					["command.options.subCommandGroup.name", new Map([["English/British", "sub-command-group"]])],
					[
						"command.options.subCommandGroup.options.subCommand.name",
						new Map([["English/British", "sub-command"]]),
					],
				]),
			});
			expect(instance.localiseCommand("command.options.subCommandGroup.options.subCommand")).to.equal(
				"/command sub-command-group sub-command",
			);
		});

		it("resolves missing parts of the command to missing strings.", () => {
			const instance = new LocalisationStore({
				localisations: new Map([
					["command.name", new Map([["English/British", "command"]])],
					["command.options.subCommandGroup.name", new Map([["English/British", "sub-command-group"]])],
					[
						"command.options.subCommandGroup.options.subCommand.name",
						new Map([["English/British", "sub-command"]]),
					],
				]),
			});
			expect(instance.localiseCommand("missing.options.missing.options.missing")).to.equal(
				`/${constants.special.missingString} ${constants.special.missingString} ${constants.special.missingString}`,
			);
			expect(instance.localiseCommand("command.options.missing.options.missing")).to.equal(
				`/command ${constants.special.missingString} ${constants.special.missingString}`,
			);
			expect(instance.localiseCommand("missing.options.subCommandGroup.options.missing")).to.equal(
				`/${constants.special.missingString} ${constants.special.missingString} ${constants.special.missingString}`,
			);
			expect(instance.localiseCommand("command.options.subCommandGroup.options.missing")).to.equal(
				`/command sub-command-group ${constants.special.missingString}`,
			);
			expect(instance.localiseCommand("missing.options.missing.options.subCommand")).to.equal(
				`/${constants.special.missingString} ${constants.special.missingString} ${constants.special.missingString}`,
			);
		});
	});

	describe("pluralise()", () => {
		it("returns the right localised string for the given quantity.", () => {
			const instance = new LocalisationStore({
				localisations: new Map([
					["things.one", new Map([["Romanian", "{one} lucru"]])],
					["things.two", new Map([["Romanian", "{two} lucruri"]])],
					["things.many", new Map([["Romanian", "{many} de lucruri"]])],
				]),
			});
			expect(instance.pluralise("things", "ron", { quantity: 1 })).to.equal("1 lucru");
			expect(instance.pluralise("things", "ron", { quantity: 2 })).to.equal("2 lucruri");
			expect(instance.pluralise("things", "ron", { quantity: 20 })).to.equal("20 de lucruri");
		});

		it("resolves to a missing string when the string key does not exist.", () => {
			const instance = new LocalisationStore({ localisations: new Map() });
			expect(instance.pluralise("things", "eng-GB", { quantity: 1 })).to.equal(constants.special.missingString);
		});
	});
});
