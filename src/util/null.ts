export type Nullable<T> = T | null;
export function toNullable<T>(data?: T) {
    return typeof data === "undefined" ? null : data;
}

export function toNullableDate(data?: { $date: string }) {
    return typeof data === "undefined" ? null : new Date(data.$date);
}
