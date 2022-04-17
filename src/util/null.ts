export type Nullable<T> = T | null;
export function toNullable<T>(data?: T) {
    return typeof data === "undefined" ? null : data;
}

/**
 * Backwards compatible convert potential Date value to Nullable<Date>.
 * @param data ISO8601 Timestamp or BSON DateTime
 * @returns 
 */
export function toNullableDate(data?: { $date: string } | string | null) {
    return data ? new Date(typeof data === 'string' ? data : data.$date) : null;
}
