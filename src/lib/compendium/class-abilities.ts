// Which class casts each class ability. Clarity files them all under one
// "Subclass Class" record type and never says whose they are, so the class
// comes from here - the Data Compendium's own Class Abilities tab gets it from
// the class marker each block sits under instead.
export const CLASS_BY_CLASS_ABILITY: Record<string, string> = {
	"Acrobat's Dodge": "Hunter",
	"Gambler's Dodge": "Hunter",
	"Marksman's Dodge": "Hunter",
	"Rally Barricade": "Titan",
	"Towering Barricade": "Titan",
	Thruster: "Titan",
	"Empowering Rift": "Warlock",
	"Healing Rift": "Warlock",
	"Phoenix Dive": "Warlock",
};
