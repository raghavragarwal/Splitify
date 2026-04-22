import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, ScrollView
} from 'react-native';
import { updateProfile } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Profile() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [loadingCurrency, setLoadingCurrency] = useState(true);

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const saved = await AsyncStorage.getItem('preferred_currency');
        if (saved) setCurrency(saved);
      } catch (err) {
        console.log('Failed to load currency preference');
      } finally {
        setLoadingCurrency(false);
      }
    };
    loadCurrency();
  }, []);

  const saveCurrency = async (value) => {
    setCurrency(value);
    try {
      await AsyncStorage.setItem('preferred_currency', value);
    } catch (err) {
      console.log('Failed to save currency preference');
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      setMessage('Name cannot be empty');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim()
      });
      setMessage('Profile updated successfully!');
    } catch (err) {
      setMessage('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const currencies = ['INR', 'USD', 'EUR', 'GBP'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Enter your name"
          placeholderTextColor="#999"
        />
        {message ? (
          <Text style={[
            styles.message,
            message.includes('success') ? styles.success : styles.errorMsg
          ]}>
            {message}
          </Text>
        ) : null}
        <TouchableOpacity
          style={styles.button}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Save Changes</Text>
          }
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Preferred Currency</Text>
        <Text style={styles.sectionSub}>Used for display across the app</Text>
        {loadingCurrency ? (
          <ActivityIndicator color="#6C63FF" style={{ marginTop: 10 }} />
        ) : (
          <View style={styles.currencyRow}>
            {currencies.map(c => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.currencyBtn,
                  currency === c && styles.currencyBtnActive
                ]}
                onPress={() => saveCurrency(c)}
              >
                <Text style={[
                  styles.currencyText,
                  currency === c && styles.currencyTextActive
                ]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>User ID</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {user?.uid?.substring(0, 16)}...
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Joined</Text>
          <Text style={styles.infoValue}>
            {user?.metadata?.creationTime
              ? new Date(user.metadata.creationTime).toLocaleDateString()
              : 'N/A'}
          </Text>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 14,
    color: '#888',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1a1a1a',
    marginTop: 10,
    marginBottom: 10,
  },
  message: {
    fontSize: 13,
    marginBottom: 8,
  },
  success: {
    color: '#27ae60',
  },
  errorMsg: {
    color: '#e74c3c',
  },
  button: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  currencyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  currencyBtnActive: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  currencyText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  currencyTextActive: {
    color: '#fff',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  infoLabel: {
    fontSize: 13,
    color: '#888',
  },
  infoValue: {
    fontSize: 13,
    color: '#1a1a1a',
    fontWeight: '500',
    maxWidth: '60%',
  },
});