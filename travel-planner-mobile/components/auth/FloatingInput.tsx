import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const BG = '#F8F8F6';
const TEXT = '#111827';
const GREY = '#6B7280';
const GREEN = '#10B981';
const RED = '#EF4444';

interface FloatingInputProps extends TextInputProps {
  label: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export function FloatingInput({
  label,
  error,
  rightElement,
  value,
  onFocus,
  onBlur,
  ...inputProps
}: FloatingInputProps) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, hasError && styles.labelError]}>{label}</Text>
      <View
        style={[
          styles.field,
          focused && !hasError && styles.fieldFocused,
          hasError && styles.fieldError,
        ]}
      >
        <TextInput
          style={styles.input}
          placeholderTextColor="#9CA3AF"
          value={value}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
        {hasError ? <Feather name="alert-circle" size={18} color={RED} style={styles.errorIcon} /> : null}
        {rightElement}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

interface PasswordInputProps extends Omit<FloatingInputProps, 'secureTextEntry' | 'rightElement'> {}

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <FloatingInput
      {...props}
      secureTextEntry={!visible}
      rightElement={
        <TouchableOpacity
          onPress={() => setVisible((v) => !v)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.eyeBtn}
        >
          <Feather name={visible ? 'eye-off' : 'eye'} size={18} color={GREY} />
        </TouchableOpacity>
      }
    />
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  label: {
    position: 'absolute',
    top: -10,
    left: 16,
    zIndex: 2,
    backgroundColor: BG,
    paddingHorizontal: 4,
    fontSize: 11,
    fontWeight: '500',
    color: GREY,
  },
  labelError: { color: RED },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 56,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  fieldFocused: {
    borderColor: GREEN,
    shadowColor: GREEN,
    shadowOpacity: 0.15,
  },
  fieldError: { borderColor: RED },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: TEXT,
    paddingVertical: 0,
  },
  errorIcon: { marginLeft: 8 },
  eyeBtn: { marginLeft: 8 },
  errorText: {
    fontSize: 12,
    color: RED,
    fontWeight: '500',
    marginTop: 6,
    paddingHorizontal: 8,
  },
});
