import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';

import { GenericErrorBoundary } from './components/generic-error-boundary';
import './index.css';
import { generateColorThemeCss } from './lib/theme';

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
				<style id="theme">{generateColorThemeCss({ mode: 'light' })}</style>
			</head>
			<body className="font-body">
				<svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" width="0" height="0">
					<defs>
						<symbol viewBox="0 0 100 175" stroke="none" fill="currentColor" id="bookmark-red">
							<path d="M0 0V121.57C0 138.994 9.84411 154.922 25.4282 162.714L50 175L74.5718 162.714C90.1559 154.922 100 138.994 100 121.57V0H0Z" />
						</symbol>
						<symbol viewBox="0 0 100 175" stroke="none" fill="currentColor" id="bookmark-green">
							<path d="M0 0V162L50 137L100 162V0H0Z" />
						</symbol>
						<symbol viewBox="0 0 100 175" stroke="none" fill="currentColor" id="bookmark-blue">
							<path d="M0 -0.00012207V150H14.2189C21.0711 150 27.5908 152.954 32.1095 158.105V158.105C41.5887 168.911 58.4113 168.911 67.8906 158.105V158.105C72.4092 152.954 78.9289 150 85.7811 150H100V-5.14984e-05L0 -0.00012207Z" />
						</symbol>
					</defs>
				</svg>

				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return <Outlet />;
}

export const ErrorBoundary = GenericErrorBoundary;

export function HydrateFallback() {
	return <p>Loading...</p>;
}
