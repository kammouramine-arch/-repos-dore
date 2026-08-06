import { array, asRecord, asString, field, type Decoder } from '@/services/http/decode';

/** The only part of a chat-completions response Avyro reads. */
export interface ChatCompletion {
  content: string;
}

const decodeMessage: Decoder<string> = (value, path) =>
  field(asRecord(value, path), 'content', asString, path);

const decodeChoice: Decoder<string> = (value, path) =>
  field(asRecord(value, path), 'message', decodeMessage, path);

/**
 * Decodes an OpenAI-compatible chat completion.
 *
 * Strict about the one field it uses and indifferent to everything else, which
 * is what lets the same decoder serve any vendor speaking this shape — and what
 * turns a changed response format into a clean `invalid-response` rather than
 * an undefined read three layers down.
 */
export const decodeChatCompletion: Decoder<ChatCompletion> = (value, path) => {
  const record = asRecord(value, path);
  const choices = field(record, 'choices', array(decodeChoice), path);
  const first = choices[0];

  return { content: first ?? '' };
};
