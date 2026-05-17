import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnboardingDots, OnboardingHeader } from '@/components/auth/AuthStepHeader';
import { getAccessToken } from '@/utils/auth';
import { hasSeenOnboarding, setOnboardingSeen } from '@/utils/onboarding';

const BG = '#F8F8F6';
const TEXT = '#111827';
const GREEN = '#10B981';
const GREY = '#6B7280';
const DARK = '#111827';

const { width: SCREEN_W } = Dimensions.get('window');

const SLIDES = [
  {
    id: 1,
    icon: 'map' as const,
    title: 'Plan Your Perfect Trip',
    subtitle: 'AI generates your full itinerary based on your budget and preferences.',
    extra: null as 'budget' | 'qr' | null,
  },
  {
    id: 2,
    icon: 'pie-chart' as const,
    title: 'Stay Within Budget',
    subtitle: 'Smart budget allocation for flights, hotels and activities.',
    extra: 'budget' as const,
  },
  {
    id: 3,
    icon: 'grid' as const,
    title: 'One QR Pass for Everything',
    subtitle: 'Single QR works at hotel, airport and transport.',
    extra: 'qr' as const,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!(await hasSeenOnboarding())) return;
      const token = await getAccessToken();
      if (cancelled) return;
      router.replace(token ? '/(tabs)' : '/login');
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const finish = async () => {
    await setOnboardingSeen();
    const token = await getAccessToken();
    if (token) {
      router.replace('/(tabs)');
      return;
    }
    router.replace('/register');
  };

  const transition = (next: number | 'finish') => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(
      ({ finished }) => {
        if (!finished) return;
        if (next === 'finish') {
          void finish();
          return;
        }
        setIndex(next);
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
      },
    );
  };

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <View style={styles.screen}>
      <OnboardingHeader
        showBack={index > 0}
        onBack={() => transition(index - 1)}
        onSkip={() => transition('finish')}
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.illustrationWrap}>
          <View style={styles.glow} />
          <View style={styles.iconCircle}>
            <Feather name={slide.icon} size={48} color={GREEN} />
          </View>

          {slide.extra === 'budget' ? (
            <>
              <View style={[styles.floatBadge, styles.floatTopRight]}>
                <Feather name="navigation" size={18} color={GREEN} />
              </View>
              <View style={[styles.floatBadge, styles.floatBottomLeft, styles.floatSmall]}>
                <Feather name="home" size={14} color={GREEN} />
              </View>
            </>
          ) : null}

          {slide.extra === 'qr' ? (
            <>
              <View style={[styles.floatBadge, styles.floatTopRight]}>
                <Feather name="grid" size={18} color={GREEN} />
              </View>
              <View style={[styles.floatBadge, styles.floatBottomLeft, styles.floatSmall]}>
                <Feather name="credit-card" size={14} color={GREEN} />
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
        </View>

        {slide.extra === 'budget' ? (
          <View style={styles.hintCard}>
            <View style={styles.hintIcon}>
              <Feather name="credit-card" size={16} color={GREEN} />
            </View>
            <View>
              <Text style={styles.hintLabel}>Daily Budget</Text>
              <Text style={styles.hintValue}>$150.00</Text>
            </View>
            <View style={styles.hintCheck}>
              <Feather name="check" size={12} color={GREEN} />
            </View>
          </View>
        ) : null}

        {slide.extra === 'qr' ? (
          <View style={styles.qrHintCard}>
            {[
              { icon: 'navigation' as const, label: 'Airport Security' },
              { icon: 'home' as const, label: 'Hotel Check-in' },
            ].map((row) => (
              <View key={row.label} style={styles.qrHintRow}>
                <View style={styles.qrHintIcon}>
                  <Feather name={row.icon} size={12} color={GREEN} />
                </View>
                <Text style={styles.qrHintLabel}>{row.label}</Text>
                <Feather name="check-circle" size={14} color={GREEN} />
              </View>
            ))}
          </View>
        ) : null}
      </Animated.View>

      <View style={[styles.bottom, { paddingBottom: 24 + insets.bottom }]}>
        <OnboardingDots activeIndex={index} count={SLIDES.length} />

        {isLast ? (
          <TouchableOpacity
            style={styles.btnGreen}
            onPress={() => transition('finish')}
            activeOpacity={0.92}
          >
            <Text style={styles.btnGreenText}>Get Started</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.btnDark}
            onPress={() => transition(index + 1)}
            activeOpacity={0.92}
          >
            <Text style={styles.btnDarkText}>Next</Text>
            <Feather name="arrow-right" size={14} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  illustrationWrap: {
    width: Math.min(SCREEN_W - 48, 280),
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: GREEN,
    opacity: 0.1,
    borderRadius: 999,
    transform: [{ scale: 1.1 }],
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  cardFrame: {
    width: 192,
    height: 192,
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
    zIndex: 1,
  },
  cardImage: { width: 128, height: 128 },
  floatBadge: {
    position: 'absolute',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 2,
  },
  floatTopRight: {
    top: -16,
    right: 32,
    width: 48,
    height: 48,
    borderRadius: 12,
    transform: [{ rotate: '12deg' }],
  },
  floatBottomLeft: {
    bottom: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    transform: [{ rotate: '-6deg' }],
  },
  floatSmall: {},
  textBlock: { alignItems: 'center', maxWidth: 300 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    color: GREY,
    textAlign: 'center',
    lineHeight: 24,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 280,
    marginTop: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F9FAFB',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  hintIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintLabel: { fontSize: 12, color: GREY, fontWeight: '500' },
  hintValue: { fontSize: 14, fontWeight: '700', color: TEXT },
  hintCheck: {
    marginLeft: 'auto',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrHintCard: {
    width: '100%',
    maxWidth: 280,
    marginTop: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F9FAFB',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  qrHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(248, 248, 246, 0.8)',
    padding: 8,
    borderRadius: 12,
  },
  qrHintIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrHintLabel: { flex: 1, fontSize: 12, fontWeight: '500', color: TEXT },
  bottom: {
    paddingHorizontal: 24,
    gap: 32,
    alignItems: 'center',
  },
  btnDark: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: DARK,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  btnDarkText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  btnGreen: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREEN,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  btnGreenText: { color: '#fff', fontSize: 16, fontWeight: '500' },
});
