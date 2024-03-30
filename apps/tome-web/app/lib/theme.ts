import { generatePalette, sameAsInput } from '@inploi/design-tokens/color';
import { asCssVar } from '@inploi/design-tokens/tokens';

type Theme = {
	mode: 'light' | 'dark';
};

export const tokens = (theme: Theme) => ({
	...generatePalette({ hue: 180, mode: theme.mode, transform: sameAsInput, prefix: 'neutral-', chroma: 0.1 }),
	...generatePalette({ hue: 180, mode: theme.mode, transform: sameAsInput, prefix: 'accent-', chroma: 1.25 }),
	...generatePalette({ hue: 20, mode: theme.mode, transform: sameAsInput, prefix: 'error-', chroma: 1 }),
});

const cssVar = asCssVar({});

export const generateColorThemeCss = (theme: Theme) => {
	const gen = tokens(theme);
	const tokenCss = Object.entries(gen).map(([key, value]) => `${cssVar('declaration', key)}: ${value};`);
	return `:root {\n${tokenCss.join('\n')}\n}`;
};
