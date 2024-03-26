import { getInitials } from '../lib/user.utils';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

export const UserAvatar = ({ user }: { user: { avatarUrl?: string | null; username?: string | null } }) => (
	<Avatar size="sm" aria-hidden="true">
		{user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
		<AvatarFallback>{getInitials(user.username ?? '')}</AvatarFallback>
	</Avatar>
);
