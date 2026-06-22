export type ValidationRule = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
  custom?: (value: string) => string | null;
};

export type ValidationErrors = Record<string, string>;

export function validateField(value: string, rules: ValidationRule): string | null {
  if (rules.required && !value.trim()) return "This field is required";
  if (rules.minLength && value.length < rules.minLength) return `Minimum ${rules.minLength} characters`;
  if (rules.maxLength && value.length > rules.maxLength) return `Maximum ${rules.maxLength} characters`;
  if (rules.pattern && !rules.pattern.test(value)) return rules.patternMessage || "Invalid format";
  if (rules.custom) return rules.custom(value);
  return null;
}

export function validateForm<T extends Record<string, string>>(
  values: T,
  rules: Record<keyof T, ValidationRule>
): ValidationErrors {
  const errors: ValidationErrors = {};
  for (const [field, fieldRules] of Object.entries(rules)) {
    const error = validateField(values[field] || "", fieldRules);
    if (error) errors[field] = error;
  }
  return errors;
}

export const emailRule: ValidationRule = {
  required: true,
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  patternMessage: "Invalid email address",
};

export const requiredRule: ValidationRule = { required: true };
