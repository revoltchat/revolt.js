/**
 * Regular expression for mentions.
 */
export const RE_MENTIONS = /<@([0-9ABCDEFGHJKMNPQRSTVWXYZ]{26})>/g;

/**
 * Regular expression for channels.
 */
export const RE_CHANNELS = /<#([0-9ABCDEFGHJKMNPQRSTVWXYZ]{26})>/g;

/**
 * Regular expression for spoilers.
 */
export const RE_SPOILER = /!!.+!!/g;
