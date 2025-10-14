import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// import DateTimePicker from '@react-native-community/datetimepicker';
import {
  AGING_PREFERENCE_OPTIONS,
  LENGTH_OPTIONS,
  RING_GAUGE_OPTIONS,
  VITOLA_OPTIONS,
  getAgingLabel,
  getLengthLabel,
  getRingGaugeLabel,
  getVitolaLabel,
} from '../constants/cigarSpecifications';

interface CigarSpecificationFormProps {
  dateAcquired: Date;
  agingPreferenceMonths: number;
  lengthInches: number | undefined;
  ringGauge: number | undefined;
  vitola: string | undefined;
  onDateAcquiredChange: (date: Date) => void;
  onAgingPreferenceChange: (months: number) => void;
  onLengthChange: (inches: number | undefined) => void;
  onRingGaugeChange: (gauge: number | undefined) => void;
  onVitolaChange: (vitola: string | undefined) => void;
}

interface DropdownProps {
  label: string;
  value: any;
  options: Array<{ value: any; label: string }>;
  onSelect: (value: any) => void;
  placeholder?: string;
}

const Dropdown: React.FC<DropdownProps> = ({ label, value, options, onSelect, placeholder }) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleSelect = (selectedValue: any) => {
    onSelect(selectedValue);
    setIsVisible(false);
  };

  const displayValue = options.find(opt => opt.value === value)?.label || placeholder;

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsVisible(true)}
      >
        <Text style={[styles.dropdownText, !value && styles.placeholderText]}>
          {displayValue}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#999" />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsVisible(false)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    value === item.value && styles.selectedOption
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text style={[
                    styles.optionText,
                    value === item.value && styles.selectedOptionText
                  ]}>
                    {item.label}
                  </Text>
                  {value === item.value && (
                    <Ionicons name="checkmark" size={20} color="#DC851F" />
                  )}
                </TouchableOpacity>
              )}
              style={styles.optionsList}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export const CigarSpecificationForm: React.FC<CigarSpecificationFormProps> = ({
  dateAcquired,
  agingPreferenceMonths,
  lengthInches,
  ringGauge,
  vitola,
  onDateAcquiredChange,
  onAgingPreferenceChange,
  onLengthChange,
  onRingGaugeChange,
  onVitolaChange,
}) => {

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Cigar Specifications</Text>
      
      {/* Date Acquired */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Date Acquired</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => {
            console.log('🔍 Date field pressed');
            // For now, just cycle through a few preset dates
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            
            const dates = [today, yesterday, weekAgo];
            const currentIndex = dates.findIndex(d => d.toDateString() === dateAcquired.toDateString());
            const nextIndex = (currentIndex + 1) % dates.length;
            onDateAcquiredChange(dates[nextIndex]);
          }}
        >
          <Ionicons name="calendar-outline" size={20} color="#DC851F" />
          <Text style={styles.dateText}>
            {dateAcquired.toLocaleDateString()}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Aging Preference */}
      <Dropdown
        label="Aging Preference"
        value={agingPreferenceMonths}
        options={AGING_PREFERENCE_OPTIONS}
        onSelect={onAgingPreferenceChange}
        placeholder="Select aging preference"
      />

      {/* Length */}
      <Dropdown
        label="Length"
        value={lengthInches}
        options={LENGTH_OPTIONS}
        onSelect={onLengthChange}
        placeholder="Select length"
      />

      {/* Ring Gauge */}
      <Dropdown
        label="Ring Gauge"
        value={ringGauge}
        options={RING_GAUGE_OPTIONS}
        onSelect={onRingGaugeChange}
        placeholder="Select ring gauge"
      />

      {/* Vitola */}
      <Dropdown
        label="Shape (Vitola)"
        value={vitola}
        options={VITOLA_OPTIONS}
        onSelect={onVitolaChange}
        placeholder="Select shape"
      />

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#CCCCCC',
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333333',
    borderWidth: 1,
    borderColor: '#555555',
    borderRadius: 8,
    padding: 12,
  },
  dropdownText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  placeholderText: {
    color: '#999999',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333333',
    borderWidth: 1,
    borderColor: '#555555',
    borderRadius: 8,
    padding: 12,
  },
  dateText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    width: '90%',
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#333333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  optionsList: {
    maxHeight: 400,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  selectedOption: {
    backgroundColor: '#2a2a2a',
  },
  optionText: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  selectedOptionText: {
    color: '#FFFFFF',
  },
});

export default CigarSpecificationForm;
