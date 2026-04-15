import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

interface ProfileFormProps {
  name: string;
  email: string;
  phone: string;
  onChangeName: (value: string) => void;
  onChangePhone: (value: string) => void;
}

export function ProfileForm({ name, email, phone, onChangeName, onChangePhone }: ProfileFormProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal info</Text>
        <View style={styles.divider} />

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={onChangeName}
          placeholder="Your name"
          placeholderTextColor={theme.colors.subtext}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, styles.inputReadOnly]}
          value={email}
          editable={false}
          placeholder="Email"
          placeholderTextColor={theme.colors.subtext}
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={onChangePhone}
          placeholder="Phone number"
          placeholderTextColor={theme.colors.subtext}
          keyboardType="phone-pad"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: { color: theme.colors.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  divider: { height: 1, backgroundColor: theme.colors.divider, marginTop: 12, marginBottom: 16 },
  label: {
    fontSize: 10,
    color: theme.colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
    fontSize: 16,
  },
  inputReadOnly: { opacity: 0.8 },
});
