# Privacy Policy

Last updated: 2026-10-01

StockApp stores grocery lists, pantry items, favorites, and recipes locally on your device. Google sign-in is optional for offline use and is used to access StockApp API account and household features.

## Information We Collect

When you sign in, StockApp sends the Google identity token to its API to authenticate your account. The API issues a StockApp session token and stores account profile and household membership data. The app retrieves account-scoped pantry, recipe, and grocery-list records from the API.

When signed in, supported recipe, pantry, grocery-list, favorite, and household changes are sent to the StockApp API. Changes made while offline remain on the device and are not automatically merged into the account after reconnecting.

If you choose to add an image to a recipe, StockApp requests access to your device photo library only for that action.

## How Information Is Used

- The app caches grocery lists, pantry items, recipes, and favorites locally on your device.
- If signed in, supported changes are stored in the StockApp API for account and household use.
- Recipe images are stored locally while offline. Signed-in image uploads require the configured Azure Blob service.

## Data Sharing

StockApp does not use Google Drive. Google processes sign-in, the StockApp API stores account and household data, and configured Azure Blob Storage stores uploaded recipe images. Copy-share links are created only when a user chooses to share a recipe or grocery list.

## Data Retention

- Local data remains on your device until you edit, remove, or uninstall the app.
- Account and household data remains in the StockApp API until it is deleted through supported account/data controls or by contacting support.

## Your Choices

- You can use StockApp without creating an account.
- Google sign-in is optional for offline use; signing out removes the API session from this device.
- You can deny photo access and continue using the app without recipe images.

## Contact

Support email: support@stockapp.app

Before store submission, implement account deletion controls, verify this policy against final hosting and retention practices, and publish it at a public HTTPS URL.