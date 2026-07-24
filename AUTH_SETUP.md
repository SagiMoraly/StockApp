# Google login and cloud sync

StockUp has two storage layers:

- `AsyncStorage` is the offline local copy.
- Google Drive `appDataFolder` is the private cloud copy for a signed-in user.

On startup, a valid saved Google token restores Google mode. Without a token, the login screen lets the user continue offline. Offline data can later be connected from Home > Settings.

## Google Cloud setup

1. Create a Google Cloud project.
2. Enable the Google Drive API.
3. Configure the OAuth consent screen.
4. Create OAuth client IDs for Web, Android, and iOS.
5. Put the three client IDs in the matching fields in `app.json`:
   - `googleWebClientId`
   - `googleAndroidClientId`
   - `googleIosClientId`
6. Rebuild the app after changing native client IDs.

For the current local Android build, create the Android OAuth client with:

- Package name: `com.stockup.mobile`
- SHA-1 certificate: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

Copy the generated Web client ID into `googleWebClientId` and the generated Android client ID into `googleAndroidClientId`. Do not use the Android client ID in the web field. Then run `npx expo run:android` again from `mobile/` so the resolved native config contains the new values. A release or EAS build needs its own Android OAuth client using the release certificate SHA-1.

If Google still returns HTTP 400, the error text identifies the mismatch:

- `invalid_client` or an empty client error: one of the client ID fields is still empty or belongs to another project.
- `DEVELOPER_ERROR`: the Android package name or SHA-1 does not match the installed build.
- `redirect_uri_mismatch`: verify the Android callback is `com.stockup.mobile:/oauthredirect` and that the OAuth client IDs are from the same Google Cloud project.

The app requests only `drive.appdata`, which Google currently classifies as a non-sensitive Drive scope. StockUp can access its own private file and does not request the user's normal Drive files. The scope still needs to be declared in Google Auth Platform's Data Access configuration, and a public production app may need Google's basic OAuth verification.

The OAuth client IDs belong to the StockUp app, not to one StockUp user. Each user signs in with their own Google account. Google issues an access token for that account, and `appDataFolder` keeps each user's `stockup-data.json` separate and private.

## Synchronization rule

The complete app state is saved as one versioned JSON file named `stockup-data.json`.

- Local state is always saved first.
- When Google login starts, an existing cloud file replaces the local copy.
- If no cloud file exists, the local copy is uploaded.
- After that, every state change writes locally and uploads to Google Drive.
- If two devices change data while offline, the last device to upload wins when it reconnects.

This simple rule is intentional. It is easy to understand and works well for one person using multiple devices. A future collaboration feature should add per-item timestamps and merge operations instead of replacing the whole file.

## Important limitation

Google Drive storage is private to one Google account. Two people sharing one Google account will see the same file. They cannot be identified separately. For separate accounts and shared shopping lists, a shared backend or a more advanced Google Drive sharing design is required.
