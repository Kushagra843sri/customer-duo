// Dynamic layer over app.json. Build-time secrets/paths come from the
// environment (never committed, never EXPO_PUBLIC_):
//  - GOOGLE_MAPS_ANDROID_API_KEY: Google Maps SDK key for the Android map.
//  - GOOGLE_SERVICES_JSON: path to the Firebase google-services.json (needed
//    for push notifications on Android development/production builds).
module.exports = ({ config }) => {
  const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;

  return {
    ...config,
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
    plugins: [
      ...(config.plugins ?? []),
      ['react-native-maps', androidGoogleMapsApiKey ? { androidGoogleMapsApiKey } : {}],
    ],
  };
};
