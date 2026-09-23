# KoiRela mobile

Native application foundation using Expo / React Native.

## Setup

1. Copy .env.example to .env and fill only public Supabase and Stripe publishable values.
2. Run npm install.
3. Run npx expo install --fix so Expo aligns native package versions with the installed SDK.
4. Replace the iOS bundle identifier, Android package, Apple merchant identifier, and EAS project ID with values owned by the production team.
5. Use a development build for Apple Pay, Google Pay, and remote push notifications.

## Production services

The app talks only to Supabase using the anon key and the signed-in user's JWT. Payment creation, moderation, timer changes, suspension, and other privileged operations are performed by Edge Functions.

Never put the Supabase service-role key or Stripe secret key in this folder.
