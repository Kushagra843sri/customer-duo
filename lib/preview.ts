/**
 * DEVELOPMENT-ONLY UI preview: EXPO_PUBLIC_UI_PREVIEW=1 serves built-in sample
 * data with no Firebase and no backend, so the screens can be viewed and
 * clicked through. Ignored in production builds (`__DEV__` is false there).
 * It authenticates nothing and persists nothing outside this process.
 */
export const isPreview: boolean = __DEV__ && process.env.EXPO_PUBLIC_UI_PREVIEW === '1';
