type Tail<T extends any[]> = T extends [infer A, ...infer R] ? R : never;
