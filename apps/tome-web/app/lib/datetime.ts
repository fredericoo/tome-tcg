type Params = {
	from?: Date;
	to: string | number | Date;
	formatter?: Intl.RelativeTimeFormat;
};

const DEFAULT_FORMATTER = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
/** From a date, calculates the relative time difference from now */
export const getRelativeTimeDifference = ({ from = new Date(), to, formatter = DEFAULT_FORMATTER }: Params) => {
	const then = to instanceof Date ? to : new Date(to);
	const diff = then.getTime() - from.getTime();

	const diffIn = {
		days: Math.round(diff / 1000 / 60 / 60 / 24),
		months: Math.round(diff / 1000 / 60 / 60 / 24 / 30),
	};

	if (diffIn.days === 0) return 'today';
	if (Math.abs(diffIn.days) < 30) return formatter.format(diffIn.days, 'days');
	if (Math.abs(diffIn.days) < 3) return formatter.format(diffIn.months, 'months');
	return diffIn.months < 0 ? 'a long time ago' : 'in a long time';
};
