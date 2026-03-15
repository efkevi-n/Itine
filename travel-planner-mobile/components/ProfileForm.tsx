import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

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
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={onChangeName}
        placeholder="Your name"
        placeholderTextColor="#64748b"
        autoCapitalize="words"
      />
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={[styles.input, styles.inputReadOnly]}
        value={email}
        editable={false}
        placeholder="Email"
        placeholderTextColor="#64748b"
      />
      <Text style={styles.label}>Phone</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={onChangePhone}
        placeholder="Phone number"
        placeholderTextColor="#64748b"
        keyboardType="phone-pad"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  label: { fontSize: 12, color: '#94a3b8', marginBottom: 6 },
  input: {
    backgroundColor: '#1e293b',
    color: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
  },
  inputReadOnly: { opacity: 0.8 },
});
