import { generatePalette, sameAsInput } from '@inploi/design-tokens/color';
import { asCssVar } from '@inploi/design-tokens/tokens';

type Theme = {
	mode: 'light' | 'dark';
};

const [black, white] = ['oklch(0% 0 0)', 'oklch(100% 0 0)'];

export const tokens = (theme: Theme) => ({
	lowest: theme.mode === 'light' ? white : black,
	highest: theme.mode === 'light' ? black : white,
	...generatePalette({ hue: 180, mode: theme.mode, transform: sameAsInput, prefix: 'neutral-', chroma: 0.1 }),
	...generatePalette({ hue: 180, mode: theme.mode, transform: sameAsInput, prefix: 'accent-', chroma: 1.25 }),
	...generatePalette({ hue: 20, mode: theme.mode, transform: sameAsInput, prefix: 'negative-', chroma: 1 }),
	...generatePalette({ hue: 152, mode: theme.mode, transform: sameAsInput, prefix: 'positive-', chroma: 1 }),
	...generatePalette({ hue: 66, mode: theme.mode, transform: sameAsInput, prefix: 'warning-', chroma: 1 }),
});

const cssVar = asCssVar({});

const getValueFromOklch = (oklch: string) => oklch.replace('oklch(', '').replace(')', '');

export const generateColorThemeCss = (theme: Theme) => {
	const gen = tokens(theme);
	const tokenCss = Object.entries(gen).map(
		([key, value]) => `${cssVar('declaration', key)}: ${getValueFromOklch(value)};`,
	);
	return `:root {\n${tokenCss.join('\n')}\n}`;
};
