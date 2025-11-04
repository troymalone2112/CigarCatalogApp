import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { getStrengthInfo, StrengthLevel } from '../utils/strengthUtils';

interface StrengthButtonProps {
  strength: string;
  onPress?: () => void;
  selected?: boolean;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

export default function StrengthButton({
  strength,
  onPress,
  selected = false,
  size = 'medium',
  disabled = false,
}: StrengthButtonProps) {
  const strengthInfo = getStrengthInfo(strength);

  const buttonStyle = [
    styles.button,
    styles[size],
    {
      backgroundColor: selected ? strengthInfo.color : strengthInfo.backgroundColor,
      borderColor: strengthInfo.borderColor,
    },
    disabled && styles.disabled,
  ];

  const textStyle = [
    styles.text,
    styles[`${size}Text`],
    {
      color: selected ? '#FFFFFF' : strengthInfo.color,
    },
    disabled && styles.disabledText,
  ];

  return (
    <TouchableOpacity style={buttonStyle} onPress={onPress} disabled={disabled} activeOpacity={0.7}>
      <Text style={textStyle}>{strengthInfo.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
  },
  medium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 80,
  },
  large: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 100,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
});

// Strength selector component for choosing strength
interface StrengthSelectorProps {
  selectedStrength: string;
  onStrengthSelect: (strength: StrengthLevel) => void;
  size?: 'small' | 'medium' | 'large';
}

export function StrengthSelector({
  selectedStrength,
  onStrengthSelect,
  size = 'medium',
}: StrengthSelectorProps) {
  const strengthLevels: StrengthLevel[] = ['Mild', 'Mild-Medium', 'Medium', 'Medium-Full', 'Full'];

  return (
    <View style={styles.selector}>
      {strengthLevels.map((strength) => (
        <StrengthButton
          key={strength}
          strength={strength}
          selected={selectedStrength === strength}
          onPress={() => onStrengthSelect(strength)}
          size={size}
        />
      ))}
    </View>
  );
}

// Add selector styles
const selectorStyles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
});

// Merge selector styles
Object.assign(styles, selectorStyles);
