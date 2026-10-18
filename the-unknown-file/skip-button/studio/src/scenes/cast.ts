import { Look, INK } from "../rig/Person";

/** Supporting cast — same rig and line style as the protagonist, different wardrobe/hair only. */
export const EXTRAS: Record<string, Look> = {
  cashier: { shirt: "#2f5e4e", shirtShade: "#264d40", sleeves: "short", bottoms: "pants", bottomColor: "#2b2d33", bottomShade: "#24262b", shoes: "#2b2b2b", shoeLine: INK, hair: "cap", hairColor: "#2f5e4e" },
  q1: { shirt: "#b46a3c", shirtShade: "#9c5a32", sleeves: "long", bottoms: "pants", bottomColor: "#3f4a5a", bottomShade: "#353f4d", shoes: "#5b4636", shoeLine: INK, hair: "short", hairColor: "#3a2b22" },
  q2: { shirt: "#6c7f99", shirtShade: "#5d6f87", sleeves: "short", bottoms: "skirt", bottomColor: "#2f3440", shoes: "#2b2b2b", shoeLine: INK, hair: "bun", hairColor: "#6b4a3a" },
  q3: { shirt: "#d9cfb8", shirtShade: "#c4b9a1", sleeves: "long", bottoms: "pants", bottomColor: "#4f5d4a", bottomShade: "#43503f", shoes: "#ffffff", hair: "curly", hairColor: "#2a221d" },
  q4: { shirt: "#7a3b4f", shirtShade: "#673244", sleeves: "short", bottoms: "pants", bottomColor: "#2b2d33", bottomShade: "#24262b", shoes: "#ffffff", hair: "long", hairColor: "#c9a46a" },
  boss: { shirt: "#e8e4dc", shirtShade: "#d4cfc5", sleeves: "long", bottoms: "pants", bottomColor: "#30343c", bottomShade: "#292d34", shoes: "#2b2b2b", shoeLine: INK, hair: "short", hairColor: "#555", glasses: true, build: 1.05 },
  friendA: { shirt: "#3f6690", shirtShade: "#355779", sleeves: "short", bottoms: "pants", bottomColor: "#5b5146", bottomShade: "#4d443b", shoes: "#ffffff", hair: "curly", hairColor: "#1e1a17" },
  friendB: { shirt: "#c98f4f", shirtShade: "#b07c43", sleeves: "short", bottoms: "shorts", bottomColor: "#2f3440", bottomShade: "#272b35", cuff: "#3d4352", shoes: "#ffffff", hair: "long", hairColor: "#4a3a33" },
  friendC: { shirt: "#5c7f5a", shirtShade: "#4f6e4d", sleeves: "long", bottoms: "pants", bottomColor: "#2b2d33", bottomShade: "#24262b", shoes: "#2b2b2b", shoeLine: INK, hair: "cap", hairColor: "#b0414a" },
  worker: { shirt: "#8d99a6", shirtShade: "#7b8692", sleeves: "long", bottoms: "pants", bottomColor: "#2f3440", bottomShade: "#272b35", shoes: "#2b2b2b", shoeLine: INK, hair: "short", hairColor: "#2a221d" },
  aunt: { shirt: "#5c7189", shirtShade: "#4d5f74", sleeves: "long", bottoms: "skirt", bottomColor: "#2f3440", shoes: "#5b4636", shoeLine: INK, hair: "long", hairColor: "#6b4a3a" },
};
export const QUEUE_LOOKS = [EXTRAS.q1, EXTRAS.q2, EXTRAS.q3, EXTRAS.q4, EXTRAS.friendC, EXTRAS.worker];
