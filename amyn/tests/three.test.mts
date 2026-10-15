import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeThree, validateThree } from "../src/lib/forms/three.ts";
import { translatePath } from "../src/lib/i18n/routes.ts";
test("AMYN 3D: bilingual routes remain on the experience", () => {
  assert.equal(translatePath("/3d", "en"), "/en/3d");
  assert.equal(translatePath("/en/3d", "fr"), "/3d");
});
test("AMYN 3D: inquiry accepts valid data and requires actual privacy consent", () => {
  const v=sanitizeThree({name:" Camille ",company:"Studio",email:"HELLO@EXAMPLE.COM",description:"Un appartement avec trois pièces à présenter.",privacy:true});
  assert.deepEqual(validateThree(v),{});assert.equal(v.email,"hello@example.com");
  assert.ok(validateThree(sanitizeThree({...v,privacy:"true"})).privacy);
  assert.ok(validateThree(sanitizeThree({...v,email:"bad\r\nBcc: bad@example.com"})).email);
  assert.ok(validateThree(sanitizeThree({...v,description:"court"})).description);
});
