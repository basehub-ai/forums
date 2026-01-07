# Auth Flow

This app uses better-auth in **stateless mode** (no database for users). Sessions are stored in Redis via `secondaryStorage`.

## Flow

1. User clicks "Login with GitHub"
2. GitHub OAuth redirects back with auth code
3. `getUserInfo` is called - fetches user profile from GitHub API
4. Session created in Redis with user data, cookie set with session token
5. On requests: cookie → Redis lookup → user data

## Why custom `getUserInfo`?

In stateless mode, better-auth generates a **random user ID** on each OAuth login. When cookies/sessions expire and user logs in again, a new ID is generated - creating duplicate users.

The fix: return a **deterministic ID** based on GitHub's user ID:

```typescript
getUserInfo: async (token) => {
  const profile = await fetchGitHubProfile(token)
  return {
    user: {
      id: `github_${profile.id}`,  // Always the same for this GitHub account
      ...
    }
  }
}
```

Now GitHub user `12345` always gets user ID `github_12345`, regardless of session state.
