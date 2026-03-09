import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: 1,
    emoji: '🗺️',
    title: 'Plan your entire trip with one QR code',
    subtitle: 'Everything you need for the perfect trip, all in one place.',
  },
  {
    id: 2,
    emoji: '🤖',
    title: 'How it works',
    subtitle: 'AI picks flights, hotels, and transport within your budget — automatically.',
  },
  {
    id: 3,
    emoji: '🚀',
    title: 'Ready to explore?',
    subtitle: 'Start planning your dream trip today.',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.replace('/login');
    }
  };

  const slide = slides[currentIndex];

  return (
    <View style={styles.container}>
      <View style={styles.slideContainer}>
        <Text style={styles.emoji}>{slide.emoji}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </View>

      <View style={styles.dotsContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index === currentIndex && styles.activeDot]}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>
          {currentIndex < slides.length - 1 ? 'Next' : 'Get Started'}
        </Text>
      </TouchableOpacity>

      {currentIndex < slides.length - 1 && (
        <TouchableOpacity onPress={() => router.replace('/login')}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', padding: 24 },
  slideContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 80, marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#38bdf8', textAlign: 'center', marginBottom: 16 },
  subtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center', lineHeight: 24 },
  dotsContainer: { flexDirection: 'row', marginBottom: 32 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1e293b', marginHorizontal: 5 },
  activeDot: { backgroundColor: '#38bdf8', width: 24 },
  button: { backgroundColor: '#38bdf8', borderRadius: 10, padding: 16, alignItems: 'center', width: '100%', marginBottom: 16 },
  buttonText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  skip: { color: '#94a3b8', fontSize: 14, marginBottom: 32 },
});