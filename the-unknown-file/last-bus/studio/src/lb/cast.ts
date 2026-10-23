import { Look, INK } from "../rig/Person";

/**
 * THE LAST BUS HOME — cast. One Look per character, used in every shot of all three nights.
 * The double uses the protagonist's Look object itself (identical in appearance by construction);
 * only its behaviour differs (see `uncanny` in lb/place.ts).
 */
export const HERO: Look = {
  shirt: "#1f2739", shirtShade: "#151b29", sleeves: "long", hood: true, shirtLen: 26,
  bottoms: "pants", bottomColor: "#3d5070", bottomShade: "#31425e",
  shoes: "#ffffff", hair: "messy", hairColor: "#17130f", stubble: 0.15,
};
export const DOUBLE: Look = HERO;
export const DRIVER: Look = {
  shirt: "#3b4350", shirtShade: "#2f3640", sleeves: "long", badge: true,
  bottoms: "pants", bottomColor: "#1a1d23", bottomShade: "#14171c",
  shoes: "#18191c", shoeLine: INK, hair: "cap", hairColor: "#18130f", capColor: "#15181e", stubble: 0.5, build: 1.12,
};
export const ROOMMATE: Look = {
  shirt: "#6a5c3c", shirtShade: "#584b30", sleeves: "long",
  bottoms: "pants", bottomColor: "#56595f", bottomShade: "#47494f",
  shoes: "#c9c4ba", shoeLine: INK, hair: "curly", hairColor: "#3a281d", glasses: true,
};
