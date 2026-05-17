import React, { useEffect, useState } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';

export const getDestinationImage = (destination: string): string => {
  const seed = destination
    .toLowerCase()
    .split(',')[0]
    .trim()
    .replace(/\s+/g, '-');
  return `https://picsum.photos/seed/${seed || 'travel'}/400/200`;
};

interface TripCoverImageProps {
  destination: string;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export function TripCoverImage({ destination, style, containerStyle }: TripCoverImageProps) {
  const [loading, setLoading] = useState(true);
  const uri = getDestinationImage(destination);

  useEffect(() => {
    setLoading(true);
  }, [uri]);

  return (
    <View style={[styles.container, containerStyle]}>
      {loading ? (
        <View style={styles.placeholder}>
          <ActivityIndicator size="small" color="#9CA3AF" />
        </View>
      ) : null}
      <Image
        source={{ uri }}
        style={[StyleSheet.absoluteFillObject, style]}
        contentFit="cover"
        onLoad={() => setLoading(false)}
        onError={() => setLoading(false)}
        transition={200}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
    zIndex: 1,
  },
});
