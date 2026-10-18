import type { Photo } from "./phone/Gallery";

/** Story data shared by both films (dates, gallery content, messages). Fiction. */
export const YEAR0 = 2026; // the morning he finds the button
export const YEAR10 = 2036; // ten years later

export const GALLERY: Array<{ title: string; photos: Photo[] }> = [
  { title: "2027", photos: [{ kind: "birthday", date: "MAY 14, 2027" }, { kind: "friends", date: "JUNE 2027" }, { kind: "beach", date: "AUGUST 2027" }, { kind: "momdad", date: "DECEMBER 2027" }, { kind: "concert", date: "2027" }, { kind: "city", date: "2027" }] },
  { title: "2029", photos: [{ kind: "wedding", date: "2029" }, { kind: "birthday", date: "MAY 14, 2029" }, { kind: "dad", date: "2029", older: 0.3 }, { kind: "mountain", date: "2029" }, { kind: "mom", date: "2029" }, { kind: "friends", date: "2029" }] },
  { title: "2031", photos: [{ kind: "baby", date: "2031" }, { kind: "apartment", date: "2031", older: 1 }, { kind: "dad", date: "2031", older: 0.7 }, { kind: "moving", date: "2031" }, { kind: "mom", date: "2031", older: 1 }, { kind: "birthday", date: "MAY 14, 2031", older: 1 }] },
  { title: "2033", photos: [{ kind: "dinner", date: "MARCH 8, 2033", older: 1 }, { kind: "dad", date: "2033", older: 1 }, { kind: "city", date: "2033", older: 1 }] },
  { title: "2035", photos: [{ kind: "dad", date: "2035", older: 1 }, { kind: "apartment", date: "2035", older: 1 }, { kind: "mountain", date: "2035", older: 1 }] },
];

/** Index of the last photo of his mother (the family dinner). */
export const LAST_MOM: [number, number] = [3, 0];

export const MOM_MESSAGES = [
  { from: "them" as const, text: "Come visit when you have time.", time: "2032" },
  { from: "them" as const, text: "I made your favorite dinner.", time: "2032" },
  { from: "them" as const, text: "Are you okay? Haven't heard from you.", time: "2033" },
  { from: "them" as const, text: "You don't have to stay long. I'd just love to see you.", time: "2033" },
];
