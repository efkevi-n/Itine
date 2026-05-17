export interface PasswordRequirement {
  key: string;
  label: string;
  met: boolean;
}

export interface PasswordStrengthResult {
  score: number;
  label: 'Weak' | 'Fair' | 'Strong';
  labelColor: string;
  barColors: string[];
  requirements: PasswordRequirement[];
  isValid: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const requirements: PasswordRequirement[] = [
    { key: 'length', label: 'At least 8 characters long', met: password.length >= 8 },
    { key: 'number', label: 'Contains a number', met: /\d/.test(password) },
    {
      key: 'special',
      label: 'Contains a special character (!@#$%)',
      met: /[!@#$%^&*]/.test(password),
    },
  ];

  const metCount = requirements.filter((r) => r.met).length;
  let score = metCount;
  if (password.length > 12 && metCount >= 2) score = 4;

  const barColors = ['#E5E7EB', '#E5E7EB', '#E5E7EB', '#E5E7EB'];
  const fillColor =
    score <= 1 ? '#F87171' : score === 2 ? '#FB923C' : GREEN;
  for (let i = 0; i < Math.min(score, 4); i++) barColors[i] = fillColor;

  let label: PasswordStrengthResult['label'] = 'Weak';
  let labelColor = GREY;
  if (score === 2) {
    label = 'Fair';
    labelColor = '#F97316';
  }
  if (score >= 3) {
    label = 'Strong';
    labelColor = GREEN;
  }
  if (score <= 1 && password.length > 0) labelColor = '#EF4444';

  return {
    score,
    label,
    labelColor,
    barColors,
    requirements,
    isValid: requirements.every((r) => r.met),
  };
}

const GREY = '#6B7280';
const GREEN = '#10B981';

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
