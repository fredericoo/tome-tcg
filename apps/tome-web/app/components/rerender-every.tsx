import { useEffect, useState } from 'react';

type RerenderEveryProps = {
	seconds: number;
	children: (count: number) => React.ReactNode;
};

export const RerenderEvery: React.FC<RerenderEveryProps> = ({ seconds, children }) => {
	const [count, setCount] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setCount(count + 1);
		}, seconds * 1000);

		return () => clearInterval(interval);
	}, [count, seconds]);

	return children(count);
};
