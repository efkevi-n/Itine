import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TEXT = '#111827';
const GREEN = '#10B981';
const GREY = '#6B7280';

interface AuthStepHeaderProps {
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

export function AuthStepHeader({ step, totalSteps, onBack, onSkip, showSkip = false }: AuthStepHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 12 }]}>
      {onBack ? (
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.85}>
          <Feather name="chevron-left" size={20} color={TEXT} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}

      <View style={styles.dots}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i <= step ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {showSkip && onSkip ? (
        <TouchableOpacity onPress={onSkip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

/** Onboarding header: optional back + skip only (no center dots). */
export function OnboardingHeader({
  showBack,
  onBack,
  onSkip,
}: {
  showBack?: boolean;
  onBack?: () => void;
  onSkip: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.onboardWrap, { paddingTop: insets.top + 12 }]}>
      {showBack && onBack ? (
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.85}>
          <Feather name="chevron-left" size={20} color={TEXT} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
      <TouchableOpacity onPress={onSkip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Text style={styles.skip}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

export function OnboardingDots({ activeIndex, count }: { activeIndex: number; count: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === activeIndex ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 8,
    zIndex: 10,
  },
  onboardWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 8,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: { width: 32 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 32, backgroundColor: GREEN },
  dotInactive: { width: 8, backgroundColor: '#E5E7EB' },
  skip: { fontSize: 14, fontWeight: '500', color: GREY },
});
