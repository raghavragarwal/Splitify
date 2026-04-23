import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput, Modal
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import {
  collection, addDoc, onSnapshot, updateDoc,
  query, orderBy, doc, getDoc, arrayUnion,
  where, getDocs, deleteDoc
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import { getExchangeRates } from '../../../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ExpenseCard from '../../../components/ExpenseCard';

export default function GroupDetail() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const navigation = useNavigation();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [rates, setRates] = useState(null);
  const [currency, setCurrency] = useState('INR');
  const [memberModal, setMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');

  useEffect(() => {
    const fetchGroup = async () => {
      const docRef = doc(db, 'groups', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const groupData = { id: docSnap.id, ...docSnap.data() };
        setGroup(groupData);
        navigation.setOptions({
          title: groupData.name,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setMemberModal(true)}
              style={{ marginRight: 16 }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
                + Member
              </Text>
            </TouchableOpacity>
          )
        });
      }
    };
    fetchGroup();
  }, [id]);

  useEffect(() => {
    const q = query(
      collection(db, 'groups', id, 'expenses'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setExpenses(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [id]);

  useEffect(() => {
    const loadRatesAndCurrency = async () => {
      const savedCurrency = await AsyncStorage.getItem('preferred_currency');
      if (savedCurrency) setCurrency(savedCurrency);
      const fetchedRates = await getExchangeRates();
      setRates(fetchedRates);
    };
    loadRatesAndCurrency();
  }, []);

  const getNetBalance = useCallback(() => {
    let youAreOwed = 0;
    let youOwe = 0;

    expenses.forEach(exp => {
      const share = exp.amount / exp.splitAmong.length;
      if (exp.paidBy === user.uid) {
        const othersCount = exp.splitAmong.filter(m => m !== user.uid).length;
        youAreOwed += share * othersCount;
      } else if (exp.splitAmong.includes(user.uid)) {
        youOwe += share;
      }
    });

    return youAreOwed - youOwe;
  }, [expenses, user.uid]);

  const handleAddExpense = useCallback(async () => {
    if (!description.trim() || !amount.trim()) {
      setError('Please fill in all fields');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await addDoc(collection(db, 'groups', id, 'expenses'), {
        description: description.trim(),
        amount: parsedAmount,
        paidBy: user.uid,
        paidByName: user.displayName || 'You',
        splitAmong: group.members,
        createdAt: new Date(),
      });
      setDescription('');
      setAmount('');
      setModalVisible(false);
    } catch (err) {
      setError('Failed to add expense');
    } finally {
      setCreating(false);
    }
  }, [description, amount, group, user, id]);

  const handleDeleteExpense = useCallback(async (expenseId) => {
    try {
      await deleteDoc(doc(db, 'groups', id, 'expenses', expenseId));
    } catch (err) {
      console.log('Failed to delete expense');
    }
  }, [id]);

  const handleAddMember = useCallback(async () => {
    if (!memberEmail.trim()) {
      setMemberError('Please enter an email');
      return;
    }
    setAddingMember(true);
    setMemberError('');
    setMemberSuccess('');
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', memberEmail.trim().toLowerCase()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setMemberError('No user found with this email. They must sign up first.');
        setAddingMember(false);
        return;
      }

      const memberDoc = snapshot.docs[0];
      const memberId = memberDoc.id;

      if (group.members.includes(memberId)) {
        setMemberError('This person is already in the group');
        setAddingMember(false);
        return;
      }

      await updateDoc(doc(db, 'groups', id), {
        members: arrayUnion(memberId)
      });

      setMemberSuccess('Member added successfully!');
      setMemberEmail('');
    } catch (err) {
      setMemberError('Failed to add member');
    } finally {
      setAddingMember(false);
    }
  }, [memberEmail, group, id]);

  const renderExpense = useCallback(({ item, index }) => (
    <View>
      <ExpenseCard
        item={item}
        userId={user.uid}
        currency={currency}
        rates={rates}
        index={index}
      />
      {item.paidBy === user.uid && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDeleteExpense(item.id)}
        >
          <Text style={styles.deleteBtnText}>Delete expense</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [user.uid, currency, rates, handleDeleteExpense]);

  const symbol = currency === 'INR' ? '₹'
    : currency === 'USD' ? '$'
    : currency === 'EUR' ? '€' : '£';

  const net = getNetBalance();
  const convertedNet = rates && currency !== 'INR'
    ? net * rates[currency]
    : net;

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#6C63FF" style={styles.loader} />
      ) : (
        <>
          {expenses.length > 0 && (
            <View style={[
              styles.balanceBanner,
              net > 0 ? styles.bannerGreen : net < 0 ? styles.bannerRed : styles.bannerPurple
            ]}>
              <Text style={styles.balanceLabel}>
                {net > 0 ? 'You are owed' : net < 0 ? 'You owe' : 'All settled up'}
              </Text>
              <Text style={styles.balanceAmount}>
                {net !== 0 ? `${symbol}${Math.abs(convertedNet).toFixed(2)}` : '🎉'}
              </Text>
            </View>
          )}

          {expenses.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🧾</Text>
              <Text style={styles.emptyTitle}>No expenses yet</Text>
              <Text style={styles.emptySub}>Tap + to add the first expense</Text>
            </View>
          ) : (
            <FlatList
              data={expenses}
              keyExtractor={item => item.id}
              renderItem={renderExpense}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Expense</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Description (e.g. Dinner)"
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              autoFocus
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Amount (₹)"
              placeholderTextColor="#999"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleAddExpense}
              disabled={creating}
            >
              {creating
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.modalButtonText}>Add Expense</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => {
              setModalVisible(false);
              setDescription('');
              setAmount('');
              setError('');
            }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={memberModal}
        transparent
        animationType="slide"
        onRequestClose={() => setMemberModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Member</Text>
            <Text style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
              They must already have a Splitify account
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Enter their email"
              placeholderTextColor="#999"
              value={memberEmail}
              onChangeText={setMemberEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />

            {memberError ? <Text style={styles.error}>{memberError}</Text> : null}
            {memberSuccess ? (
              <Text style={{ color: '#27ae60', fontSize: 13, marginBottom: 10 }}>
                {memberSuccess}
              </Text>
            ) : null}

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleAddMember}
              disabled={addingMember}
            >
              {addingMember
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.modalButtonText}>Add Member</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => {
              setMemberModal(false);
              setMemberEmail('');
              setMemberError('');
              setMemberSuccess('');
            }}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loader: {
    flex: 1,
    marginTop: 100,
  },
  balanceBanner: {
    padding: 20,
    alignItems: 'center',
  },
  bannerGreen: {
    backgroundColor: '#27ae60',
  },
  bannerRed: {
    backgroundColor: '#e74c3c',
  },
  bannerPurple: {
    backgroundColor: '#6C63FF',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 4,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#888',
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabText: {
    color: '#fff',
    fontSize: 32,
    lineHeight: 36,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  error: {
    color: '#e74c3c',
    fontSize: 13,
    marginBottom: 10,
  },
  modalButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelText: {
    color: '#888',
    textAlign: 'center',
    fontSize: 15,
    padding: 8,
  },
  deleteBtn: {
    marginTop: -6,
    marginBottom: 10,
    marginLeft: 4,
    alignSelf: 'flex-start',
  },
  deleteBtnText: {
    fontSize: 12,
    color: '#e74c3c',
    paddingHorizontal: 4,
  },
});