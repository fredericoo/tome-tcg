import { ClientActionFunction, Form } from '@remix-run/react';
import { useActionData } from 'react-router-typesafe';

import { Button } from '../components/button';
import { api } from '../lib/api';

export const clientAction = (async () => {
	const { error } = await api.auth.logout.post();
	if (error) {
		return { error };
	}
}) satisfies ClientActionFunction;

export default function Page() {
	const actionData = useActionData<typeof clientAction>();

	return (
		<section className="mx-auto w-full max-w-lg ">
			<Form method="POST">
				<Button variant="destructive" className="w-full">
					Log out
				</Button>
			</Form>
			{actionData?.error && <p role="alert">{actionData.error.value}</p>}
		</section>
	);
}
