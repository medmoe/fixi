import { authReducer, clearCredentials, setCredentials, setUser } from './authSlice';
import type { UserRead } from './types';

describe('authSlice', () => {
  it('sets access token and user', () => {
    const user: UserRead = {
      id: 1,
      name: 'Alex',
      username: 'alex01',
      email: 'alex@example.com',
      profile_image_url: 'https://example.com/avatar.png',
      role_type: 'customer',
      tier_id: null
    };

    const stateWithToken = authReducer(undefined, setCredentials({ accessToken: 'token-123' }));
    expect(stateWithToken.accessToken).toBe('token-123');

    const stateWithUser = authReducer(stateWithToken, setUser(user));
    expect(stateWithUser.user?.username).toBe('alex01');
  });

  it('clears credentials', () => {
    const user: UserRead = {
      id: 1,
      name: 'Alex',
      username: 'alex01',
      email: 'alex@example.com',
      profile_image_url: 'https://example.com/avatar.png',
      role_type: 'customer',
      tier_id: null
    };

    const populated = authReducer(undefined, setCredentials({ accessToken: 'token-123' }));
    const populatedWithUser = authReducer(populated, setUser(user));
    const cleared = authReducer(populatedWithUser, clearCredentials());

    expect(cleared.accessToken).toBeNull();
    expect(cleared.user).toBeNull();
  });
});
