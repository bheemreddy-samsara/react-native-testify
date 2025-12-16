import React from 'react';
import {ProfileScreen, type UserProfile} from './ProfileScreen';

// Mock user data for different states
const mockActiveUser: UserProfile = {
  name: 'Alice Johnson',
  email: 'alice@example.com',
  role: 'Senior Developer',
  isActive: true,
  joinedDate: 'Jan 2023',
};

const mockInactiveUser: UserProfile = {
  name: 'Bob Smith',
  email: 'bob@example.com',
  role: 'Designer',
  isActive: false,
  joinedDate: 'Mar 2022',
};

export default {
  // Loading state
  'Screen/Profile/Loading': {
    render: () => <ProfileScreen loading={true} />,
  },

  // Empty state (no user logged in)
  'Screen/Profile/Empty': {
    render: () => <ProfileScreen user={null} />,
  },

  // Error state
  'Screen/Profile/Error': {
    render: () => (
      <ProfileScreen
        error="Unable to load profile. Please check your connection and try again."
      />
    ),
  },

  // With active user
  'Screen/Profile/ActiveUser': {
    render: () => <ProfileScreen user={mockActiveUser} />,
  },

  // With inactive user
  'Screen/Profile/InactiveUser': {
    render: () => <ProfileScreen user={mockInactiveUser} />,
  },
};
