import { getInitials } from '../lib/user.utils';
import { Avatar, AvatarFallback, AvatarImage, AvatarProps } from './avatar';

interface UserAvatarProps extends AvatarProps {
	user: { avatarUrl?: string | null; username?: string | null };
}

export const UserAvatar = ({ user, ...props }: UserAvatarProps) => (
	<Avatar aria-hidden="true" {...props}>
		{user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
		<AvatarFallback>{getInitials(user.username ?? '')}</AvatarFallback>
	</Avatar>
);
