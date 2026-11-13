import React from 'react';
import AvatarRenderer from '../Avatars/AvatarRenderer';
import { resolveUserAvatarId } from '../../constants/avatars';

export default function UserAvatar({
  user,
  avatarId,
  className = 'w-10 h-10 rounded-full border border-slate-200',
  ...props
}) {
  const resolvedAvatarId = avatarId || resolveUserAvatarId(user);
  return (
    <AvatarRenderer
      avatarId={resolvedAvatarId}
      gender={user?.gender}
      className={className}
      {...props}
    />
  );
}
