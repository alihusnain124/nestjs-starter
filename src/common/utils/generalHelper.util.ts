export const formatErrorTitle = (fieldName: string): string => {
  if (!fieldName || typeof fieldName !== 'string') {
    console.warn(
      `Invalid field name provided to formatErrorTitle: ${fieldName}`,
    );
    return 'Invalid Field';
  }

  return fieldName
    .split(/(?=[A-Z])/)
    .join(' ')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};
