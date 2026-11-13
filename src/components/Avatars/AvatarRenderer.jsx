import React from 'react';
import FemaleHijab from './FemaleHijab';
import FemaleNiqab from './FemaleNiqab';
import FemaleSaree from './FemaleSaree';
import FemaleSalwar from './FemaleSalwar';
import FemaleWestern from './FemaleWestern';
import MaleSuit from './MaleSuit';
import MaleShirt from './MaleShirt';
import MalePanjabi from './MalePanjabi';
import MalePanjabiTupi from './MalePanjabiTupi';
import MalePolo from './MalePolo';
import { getDefaultAvatarId, isValidAvatarId } from '../../constants/avatars';

export const AVATAR_COMPONENT_MAP = {
  female_hijab: FemaleHijab,
  female_niqab: FemaleNiqab,
  female_saree: FemaleSaree,
  female_salwar: FemaleSalwar,
  female_western: FemaleWestern,
  male_suit: MaleSuit,
  male_shirt: MaleShirt,
  male_panjabi: MalePanjabi,
  male_panjabi_tupi: MalePanjabiTupi,
  male_polo: MalePolo,
};

export default function AvatarRenderer({
  avatarId,
  gender = 'Male',
  className = 'w-12 h-12',
  ...props
}) {
  const resolvedId = isValidAvatarId(avatarId)
    ? avatarId
    : getDefaultAvatarId(gender);

  const AvatarComponent = AVATAR_COMPONENT_MAP[resolvedId] || MaleSuit;

  return (
    <AvatarComponent
      className={`rounded-full overflow-hidden shrink-0 select-none ${className}`}
      {...props}
    />
  );
}
