# Store Readiness

This project now includes the first release-hardening pass:

- App branding and package metadata in `app.json`
- Basic EAS build profiles in `eas.json`
- Safe-area shell handling in the app root
- Empty first-run content instead of seeded demo recipes and items
- Versioned storage recovery for invalid local app data
- Store submission templates under `store/`

Before uploading to the stores, finish the remaining release work:

1. Replace placeholder identifiers if `com.stockapp.mobile` is not your final package name.
2. Replace placeholder support and privacy URLs with hosted production URLs.
3. Add the store screenshots and marketing graphics listed in `store/STORE_ASSETS.md`.
4. Test on at least one physical Android device and one physical iPhone.
5. Clearly disclose that offline changes are local-only and are not automatically merged after reconnecting.
6. Run the mobile CI typecheck/Jest job and complete device-level sign-in, API, and configured image checks.