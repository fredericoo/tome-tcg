import chalk from 'chalk';

export const takeFirst = <T>(arr: T[]) => arr[0];
export const takeFirstOrThrow = <T>(arr: T[]) => {
	if (!arr[0]) throw new Error('No results found');
	return arr[0];
};

export const exhaustive = (value: never) => {
	throw new Error(`Unhandled discriminated union member: ${JSON.stringify(value)}`);
};

export function invariant(condition: any, message: string): asserts condition {
	if (condition) return;
	throw new Error(message);
}

type Color =
	| 'black'
	| 'red'
	| 'green'
	| 'yellow'
	| 'blue'
	| 'magenta'
	| 'cyan'
	| 'white'
	| 'gray'
	| 'grey'
	| 'blackBright'
	| 'redBright'
	| 'greenBright'
	| 'yellowBright'
	| 'blueBright'
	| 'magentaBright'
	| 'cyanBright'
	| 'whiteBright';
const toBgColor = <T extends Color>(color: T) =>
	`bg${color[0]!.toUpperCase()}${color.slice(1)}` as `bg${Capitalize<T>}`;
export const pill = (color: Color, text: any) => chalk[color](`\uE0B6${chalk[toBgColor(color)](text)}\uE0B4`);

/**
 *  Overengineered solution to "type-safe" split const strings
 *  @example stringSplit('cats, cars', ', ') => ['cats', 'cars']
 */
type StringSplit<T extends string, D extends string> = T extends `${infer L}${D}${infer R}` ? [L, ...StringSplit<R, D>]
:	[T];
export const stringSplit = <T extends string, D extends string>(input: T, divider: D) =>
	input.split(divider) as StringSplit<T, D>;

export function noop() {}

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
