# Native P0 parity

Carry the approved Today settings, LearningUnit/Lesson and pronunciation changes into existing native hosts without duplicating business logic or changing saved data.

Desktop already bundles the shared Next app. Build a local unsigned/ad-hoc app with updater artifact signing disabled only in the build command. Preserve release configuration, installed application and user profile. Verify bundled routes and desktop-host UI.

iOS uses UIKit/WKWebView and defaults to the production website. Register /learn as a Home-owned section with My Courses/Lesson titles and section-aware back behavior. Keep native tabs and safe areas. Build and test on the existing simulator using a runtime localhost override; do not change the production default. Verify Today settings and pronunciation render in the native host. This is source/build parity, not a promise that unreleased website changes are already on physical phones.

No production deployment, TestFlight upload, new cloud migration, signing-secret access, or user-data reset. Actual acoustic quality remains a real-device/manual check.

Native screenshot follow-through: cover the top safe area with a noninteractive opaque backdrop so scrolled web text cannot overlap system status text. Match the existing shell's fixed dark status icons and light web surface; do not alter web layout/insets or redesign native tabs.
