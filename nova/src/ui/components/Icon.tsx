import Ionicons from '@expo/vector-icons/Ionicons';

/**
 * The app's single icon family.
 *
 * Imported from the family's own entry point rather than the `@expo/vector-icons`
 * barrel on purpose: the barrel re-exports every family, and Metro then bundles
 * every font file with it — several megabytes of glyphs Nova never draws.
 *
 * Routing every call site through here also means the icon set is one import to
 * change, and features never depend on the icon library directly.
 */
export const Icon = Ionicons;

export type IconName = keyof typeof Ionicons.glyphMap;
