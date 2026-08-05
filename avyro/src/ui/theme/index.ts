/**
 * The design system's tokens — the single source of truth for every colour,
 * gap, radius and type style in the app.
 *
 * Avyro is dark-first and ships one palette, so these are module constants
 * rather than context values: components build their styles once at module
 * scope instead of on every render. Adding a second palette later means moving
 * these behind a provider; the token names do not change.
 */
export { colors, gradients, palette } from './colors';
export { motion, radius, shadows, sizing, spacing } from './layout';
export { typography, type TextVariant } from './typography';
