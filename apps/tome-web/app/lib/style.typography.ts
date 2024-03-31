import plugin from 'tailwindcss/plugin';
import { CSSRuleObject, PluginAPI } from 'tailwindcss/types/config';

import { pxToRem } from './styles.utils';

type Theme = Parameters<Parameters<typeof plugin>[0]>[0]['theme'];

/** All properties are semantic from the theme. */
const textStyles: TextStylesFn = theme => ({
	display: {
		'2xs': {
			fontFamily: theme('fontFamily.display'),
			fontWeight: theme('fontWeight.medium'),
			fontSize: pxToRem(24),
			lineHeight: pxToRem(32),
			letterSpacing: theme('letterSpacing.tighter'),
		},
		xs: {
			fontFamily: theme('fontFamily.display'),
			fontWeight: theme('fontWeight.medium'),
			fontSize: pxToRem(32),
			lineHeight: pxToRem(40),
			letterSpacing: theme('letterSpacing.tighter'),
		},
		sm: {
			fontFamily: theme('fontFamily.display'),
			fontWeight: theme('fontWeight.medium'),
			fontSize: pxToRem(36),
			lineHeight: pxToRem(44),
			letterSpacing: theme('letterSpacing.tighter'),
		},
		md: {
			fontFamily: theme('fontFamily.display'),
			fontWeight: theme('fontWeight.bold'),
			fontSize: pxToRem(40),
			lineHeight: pxToRem(48),
			letterSpacing: theme('letterSpacing.tighter'),
		},
		lg: {
			fontFamily: theme('fontFamily.display'),
			fontWeight: theme('fontWeight.bold'),
			fontSize: pxToRem(44),
			lineHeight: pxToRem(52),
			letterSpacing: theme('letterSpacing.tighter'),
		},
	},
	heading: {
		overline: {
			fontFamily: theme('fontFamily.body'),
			fontWeight: theme('fontWeight.medium'),
			fontSize: pxToRem(16),
			lineHeight: pxToRem(24),
			letterSpacing: theme('letterSpacing.widest'),
			textTransform: 'uppercase',
		},
		sm: {
			fontFamily: theme('fontFamily.body'),
			fontWeight: theme('fontWeight.medium'),
			fontSize: pxToRem(14),
			lineHeight: pxToRem(20),
			letterSpacing: theme('letterSpacing.normal'),
		},
		md: {
			fontFamily: theme('fontFamily.body'),
			fontWeight: theme('fontWeight.medium'),
			fontSize: pxToRem(18),
			lineHeight: pxToRem(24),
			letterSpacing: theme('letterSpacing.normal'),
		},
		lg: {
			fontFamily: theme('fontFamily.body'),
			fontWeight: theme('fontWeight.medium'),
			fontSize: pxToRem(20),
			lineHeight: pxToRem(28),
			letterSpacing: theme('letterSpacing.normal'),
		},
	},
	body: {
		xs: {
			fontFamily: theme('fontFamily.body'),
			fontWeight: theme('fontWeight.regular'),
			fontSize: pxToRem(12),
			lineHeight: pxToRem(16),
			letterSpacing: theme('letterSpacing.normal'),
		},
		sm: {
			fontFamily: theme('fontFamily.body'),
			fontWeight: theme('fontWeight.regular'),
			fontSize: pxToRem(14),
			lineHeight: pxToRem(18),
			letterSpacing: theme('letterSpacing.normal'),
		},
		md: {
			fontFamily: theme('fontFamily.body'),
			fontWeight: theme('fontWeight.regular'),
			fontSize: pxToRem(16),
			lineHeight: pxToRem(24),
			letterSpacing: theme('letterSpacing.normal'),
		},
		lg: {
			fontFamily: theme('fontFamily.body'),
			fontWeight: theme('fontWeight.regular'),
			fontSize: pxToRem(18),
			lineHeight: pxToRem(28),
			letterSpacing: theme('letterSpacing.normal'),
		},
	},
	label: {
		xs: {
			fontFamily: theme('fontFamily.body'),
			fontWeight: theme('fontWeight.medium'),
			fontSize: pxToRem(12),
			lineHeight: pxToRem(16),
			letterSpacing: theme('letterSpacing.normal'),
		},
		sm: {
			fontFamily: theme('fontFamily.body'),
			fontWeight: theme('fontWeight.medium'),
			fontSize: pxToRem(14),
			lineHeight: pxToRem(20),
			letterSpacing: theme('letterSpacing.normal'),
		},
		md: {
			fontFamily: theme('fontFamily.body'),
			fontWeight: theme('fontWeight.medium'),
			fontSize: pxToRem(16),
			lineHeight: pxToRem(24),
			letterSpacing: theme('letterSpacing.normal'),
		},
		lg: {
			fontFamily: theme('fontFamily.body'),
			fontWeight: theme('fontWeight.medium'),
			fontSize: pxToRem(18),
			lineHeight: pxToRem(28),
			letterSpacing: theme('letterSpacing.normal'),
		},
	},
});

type TextStyles = Record<string, Record<string, CSSRuleObject>>;
type TextStylesFn = (theme: Theme) => TextStyles;

const makeTextStyles = (
	obj: TextStylesFn,
	property: string,
	deps: { matchUtilities: PluginAPI['matchUtilities']; theme: Theme },
) => {
	return deps.matchUtilities(
		{
			[property]: value => {
				return obj(deps.theme)[property]?.[value] ?? null;
			},
		},
		{ values: Object.fromEntries(Object.keys(obj(deps.theme)[property] ?? {}).map(i => [i, i])) },
	);
};

export const textStylesPlugin = plugin(({ matchUtilities, theme }) => {
	makeTextStyles(textStyles, 'display', { matchUtilities, theme });
	makeTextStyles(textStyles, 'heading', { matchUtilities, theme });
	makeTextStyles(textStyles, 'body', { matchUtilities, theme });
	makeTextStyles(textStyles, 'label', { matchUtilities, theme });
});
