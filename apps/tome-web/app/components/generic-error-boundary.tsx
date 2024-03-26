import { isRouteErrorResponse, useAsyncError, useRouteError } from '@remix-run/react';
import { P, match } from 'ts-pattern';

import { ErrorView } from '../components/error-view';

export const GenericErrorBoundary = () => {
	/** Route errors are errors thrown by loaders and actions */
	const routeError = useRouteError();
	/** Async errors are errors thrown by <Await/> elements */
	const asyncError = useAsyncError();
	const error = routeError || asyncError;

	/** If a remix route error was thrown */
	return (
		match(error)
			/** Not found */
			.with(
				P.union({
					status: 404,
					data: P.optional(P.string),
					statusText: P.optional(P.string),
					value: P.optional(P.string),
				}),
				error => (
					<ErrorView
						heading={error.statusText ?? 'Nothing here'}
						message={error.data ?? error.value ?? 'The page you were looking for was not found.'}
					/>
				),
			)
			/** Unauthorized */
			.with(
				{ status: 401, data: P.optional(P.string), statusText: P.optional(P.string), value: P.optional(P.string) },
				error => {
					return (
						<ErrorView
							error={error}
							heading={error.statusText ?? 'Unauthenticated'}
							message={error.data ?? error.value ?? 'You need to be signed in to see this page.'}
							action={{ label: 'Sign in', link: `${import.meta.env.VITE_API_URL}/auth/github` }}
						/>
					);
				},
			)
			/** Server error */
			.with({ status: 500 }, error => (
				<ErrorView
					error={error}
					heading="Something went wrong"
					message={
						isRouteErrorResponse(error) ?
							error.data.message
						:	'An internal server error happened. It’s not you, it’s us.'
					}
					action={{
						label: 'Try again',
						link: '',
					}}
				/>
			))
			/** Unknown error */
			.otherwise(() => <ErrorView error={error} heading="Something went wrong" message={'Unknown error.'} />)
	);
};
