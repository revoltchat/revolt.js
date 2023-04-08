import { channelHydration } from "./channel";
import { emojiHydration } from "./emoji";
import { messageHydration } from "./message";
import { serverHydration } from "./server";
import { serverMemberHydration } from "./serverMember";
import { userHydration } from "./user";

/**
 * Functions to map from one object to another
 */
export type MappingFns<Input, Output, Key extends keyof Output> = Record<
  Key,
  (value: Input) => Output[Key]
>;

/**
 * Key mapping information
 */
export type KeyMapping<Input, Output> = Record<keyof Input, keyof Output>;

/**
 * Hydration information
 */
export type Hydrate<Input, Output> = {
  keyMapping: Partial<KeyMapping<Input, Output>>;
  functions: MappingFns<Input, Output, keyof Output>;
};

/**
 * Hydrate some data
 * @param hydration Hydration data
 * @param input Input data
 * @returns Output data
 */
function hydrateInternal<Input extends object, Output>(
  hydration: Hydrate<Input, Output>,
  input: Input
): Output {
  return (Object.keys(input) as (keyof Input)[]).reduce((acc, key) => {
    let targetKey, value;
    try {
      targetKey = hydration.keyMapping[key] ?? key;
      value = hydration.functions[targetKey as keyof Output](input);
    } catch (err) {
      console.debug(`Skipping key ${String(key)} during hydration!`);
      return acc;
    }

    return {
      ...acc,
      [targetKey]: value,
    };
  }, {} as Output);
}

const hydrators = {
  channel: channelHydration,
  emoji: emojiHydration,
  message: messageHydration,
  server: serverHydration,
  serverMember: serverMemberHydration,
  user: userHydration,
};

export type Hydrators = typeof hydrators;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtractInput<T> = T extends Hydrate<infer I, any> ? I : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtractOutput<T> = T extends Hydrate<any, infer O> ? O : never;

/**
 * Hydrate some input with a given type
 * @param type Type
 * @param input Input Object
 * @returns Hydrated Object
 */
export function hydrate<T extends keyof Hydrators>(
  type: T,
  input: Partial<ExtractInput<Hydrators[T]>>
) {
  return hydrateInternal(hydrators[type] as never, input) as ExtractOutput<
    Hydrators[T]
  >;
}
