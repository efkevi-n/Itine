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
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';

const { width: windowWidth } = Dimensions.get('window');

const H_PADDING = 24;
const progressTrackWidth = windowWidth - H_PADDING * 2;

const slides = [
  {
    id: 1,
    icon: 'pin' as const,
    title: 'Plan Your Perfect Trip',
    subtitle: 'Everything you need for the perfect journey, all in one place.',
  },
  {
    id: 2,
    icon: 'sparkles' as const,
    title: 'AI Does The Heavy Lifting',
    subtitle: 'Flights, hotels and activities picked within your budget — automatically.',
  },
  {
    id: 3,
    icon: 'rocket' as const,
    title: 'Ready to Explore?',
    subtitle: 'Start planning your dream trip today. Your adventure awaits.',
  },
];

function SlideIcon({ type }: { type: 'pin' | 'sparkles' | 'rocket' }) {
  if (type === 'pin') {
    return (
      <Svg width={56} height={56} viewBox="0 0 24 24">
        <Path
          fill="#6366f1"
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"
        />
      </Svg>
    );
  }
  if (type === 'sparkles') {
    return (
      <Svg width={56} height={56} viewBox="0 0 24 24">
        <Path
          fill="#6366f1"
          d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9z"
        />
        <Path
          fill="#6366f1"
          d="M19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"
        />
        <Path
          fill="#6366f1"
          d="M11.5 9.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5z"
        />
      </Svg>
    );
  }
  return (
    <Svg width={56} height={56} viewBox="0 0 24 24">
      <Path fill="#6366f1" d="M12 2.5L4 14h4.5V22h7v-8H20L12 2.5z" />
    </Svg>
  );
}

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();

  const fadeOpacity = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(1 / slides.length)).current;

  const slide = slides[currentIndex];
  const slidePill = `${String(currentIndex + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (currentIndex + 1) / slides.length,
      duration: 450,
      useNativeDriver: false,
    }).start();
  }, [currentIndex]);

  useEffect(() => {
    AsyncStorage.removeItem('onboarding_seen');
  }, []);

  const handleFinish = async () => {
    await AsyncStorage.setItem('onboarding_seen', 'true');
    setTimeout(() => {
      router.replace('/login');
    }, 100);
  };

  const fadeInContent = () => {
    fadeOpacity.setValue(0);
    Animated.timing(fadeOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const runSlideTransition = (afterFadeOut: () => void) => {
    Animated.timing(fadeOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      afterFadeOut();
      setTimeout(() => {
        fadeInContent();
      }, 0);
    });
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      runSlideTransition(() => {
        setCurrentIndex((i) => i + 1);
      });
    } else {
      Animated.timing(fadeOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) void handleFinish();
      });
    }
  };

  const handleSkip = () => {
    Animated.timing(fadeOpacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) void handleFinish();
    });
  };

  const fillWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, progressTrackWidth],
  });

  return (
    <View style={styles.screen}>
      <View style={[styles.glowOrb, styles.glowOrbTop]} pointerEvents="none" />
      <View style={[styles.glowOrb, styles.glowOrbBottom]} pointerEvents="none" />

      <View style={styles.inner}>
        <View style={styles.contentArea}>
          <Animated.View style={[styles.slideBlock, { opacity: fadeOpacity }]}>
            <View style={styles.iconWrap}>
              <SlideIcon type={slide.icon} />
            </View>

            <View style={styles.pill}>
              <Text style={styles.pillText}>{slidePill}</Text>
            </View>

            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </Animated.View>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: fillWidth }]} />
          </View>
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.9}>
            <Text style={styles.primaryBtnText}>
              {currentIndex < slides.length - 1 ? 'Next \u2192' : 'Get Started'}
            </Text>
          </TouchableOpacity>

          {currentIndex < slides.length - 1 ? (
            <TouchableOpacity onPress={handleSkip} style={styles.skipWrap} hitSlop={{ top: 12, bottom: 12 }}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0d0d14',
  },
  glowOrb: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.08)',
  },
  glowOrbTop: {
    top: -80,
    right: -100,
  },
  glowOrbBottom: {
    bottom: -120,
    left: -80,
  },
  inner: {
    flex: 1,
    paddingHorizontal: H_PADDING,
    paddingBottom: 24,
    paddingTop: 56,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
  },
  slideBlock: {
    alignItems: 'center',
    width: '100%',
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 28,
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    marginTop: 28,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pillText: {
    fontSize: 11,
    color: '#4b5563',
    fontWeight: '600',
  },
  title: {
    marginTop: 32,
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 32 * 1.2,
    paddingHorizontal: 8,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 300,
    alignSelf: 'center',
    paddingHorizontal: 4,
  },
  progressTrack: {
    width: '100%',
    maxWidth: progressTrackWidth,
    alignSelf: 'center',
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginTop: 40,
  },
  progressFill: {
    height: 2,
    borderRadius: 1,
    backgroundColor: '#6366f1',
  },
  bottom: {
    paddingTop: 8,
  },
  primaryBtn: {
    width: '100%',
    height: 54,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  skipWrap: {
    alignItems: 'center',
    marginTop: 16,
  },
  skipText: {
    color: '#4b5563',
    fontSize: 15,
    textAlign: 'center',
  },
});
