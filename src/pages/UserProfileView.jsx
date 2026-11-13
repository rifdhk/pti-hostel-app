import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserProfileContent } from '../components/common/UserProfileModal';

export default function UserProfileView() {
  const { userId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
      <UserProfileContent
        userId={userId}
        mode="page"
        onBack={() => navigate(-1)}
      />
    </div>
  );
}
