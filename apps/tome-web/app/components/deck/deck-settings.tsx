import { IconSettings } from '@tabler/icons-react';

import { Input } from '../input';
import { SectionCard } from '../section-card';

export const DeckSettings = ({ defaultValues }: { defaultValues?: { name: string } }) => {
	return (
		<SectionCard.Root>
			<SectionCard.Header>
				<SectionCard.TitleBar Icon={IconSettings}>
					<h1 className="heading-sm">Deck settings</h1>
				</SectionCard.TitleBar>
			</SectionCard.Header>
			<SectionCard.Content>
				<fieldset className="p-4">
					<label htmlFor="name">
						<span className="label-sm">Name</span>
						<Input defaultValue={defaultValues?.name} form="deck-builder" id="name" type="text" name="name" />
					</label>
				</fieldset>
			</SectionCard.Content>
		</SectionCard.Root>
	);
};
