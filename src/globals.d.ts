type Tail<T extends unknown[]> = T extends [infer _A, ...infer R] ? R : never;
