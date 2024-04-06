/**
 * A destructive way to ensure an object has a property.
 * This is useful when working when unknowns.
 */
export function hasProp<K extends PropertyKey>(data: object, prop: K): data is Record<K, unknown> {
	return prop in data;
}

/**
 * A sort of type safe way to check whether a key exists in an object.
 */
export function isKeyInObj<O extends Record<string, unknown>>(key: PropertyKey, obj: O): key is keyof O {
	return key in obj;
}

/**
 * A type safe way to get the keys and values of an object..
 */
export const objectEntries = <TObj extends object>(obj: TObj) =>
	Object.entries(obj) as Array<[keyof TObj, TObj[keyof TObj]]>;

export const objectKeys = <TObj extends object>(obj: TObj) => Object.keys(obj) as Array<keyof TObj>;

export type NonEmptyString<T extends string> = T extends '' ? never : T;

export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Constructs a string type with type hints for known values.
 */
export type HintedString<KnownValues extends string> =
	// eslint-disable-next-line @typescript-eslint/ban-types
	(string & {}) | KnownValues;

// eslint-disable-next-line @typescript-eslint/ban-types
export type Flatten<T> = { [K in keyof T]: T[K] } & {};

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/** Allows you to get a type from a union of types.
 * @example Select<string | number, string> will return string. */
export type Select<T, U extends T> = U;

export type Maybe<T> = T | null | undefined;

export type PartialReadonly<T> = T | Readonly<T>;

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
export type NoInfer<A extends any> = [A][A extends any ? 0 : never];

export type DistributivePick<T, K extends keyof T> = T extends unknown ? Pick<T, K> : never;

export type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
