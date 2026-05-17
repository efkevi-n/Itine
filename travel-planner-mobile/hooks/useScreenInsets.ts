import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Must match `app/(tabs)/_layout.tsx` tab bar height formula. */
export function getTabBarHeight(bottomInset: number): number {
  return 64 + Math.max(bottomInset, 16);
}

/**
 * Consistent safe-area padding for full-screen layouts.
 * Use `tabScrollBottom` on tab screens with a floating tab bar.
 * Use `stackScrollBottom` on stack screens with a sticky bottom CTA.
 */
export function useScreenInsets() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = getTabBarHeight(insets.bottom);
  const horizontal = Math.max(insets.left, insets.right, 0);

  return {
    insets,
    top: insets.top + 12,
    bottom: insets.bottom + 16,
    horizontal,
    contentPaddingHorizontal: Math.max(24, horizontal + 16),
    tabBarHeight,
    /** Scroll end padding above the floating tab bar */
    tabScrollBottom: tabBarHeight + 40,
    /** Scroll end padding above a sticky footer button on stack screens */
    stackScrollBottom: insets.bottom + 160,
    /** Stack screens without a sticky footer */
    stackScrollBottomCompact: insets.bottom + 40,
  };
}
