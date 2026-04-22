import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput,
  Modal, ScrollView
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import {
  collection, addDoc, onSnapshot,
  query, orderBy, doc, getDoc
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';

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

  useEffect(() => {
    const fetchGroup = async () => {
      const docRef = doc(db, 'groups', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const groupData = { id: docSnap.id, ...docSnap.data() };
        setGroup(groupData);
        navigation.setOptions({ title: groupData.name });
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

  const getBalances = useCallback(() => {
    if (!expenses.length) return [];
    const balanceMap = {};
    expenses.forEach(exp => {
      const share = exp.amount / exp.splitAmong.length;
      exp.splitAmong.forEach(memberId => {
        if (memberId !== exp.paidBy) {
          if (!balanceMap[memberId]) balanceMap[memberId] = 0;
          balanceMap[memberId] += share;
        }
      });
    });
    return Object.entries(balanceMap).map(([uid, amount]) => ({
      uid,
      owes: amount,
      name: uid === user.uid ? 'You' : 'Member',
    }));
  }, [expenses]);

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

  const renderExpense = useCallback(({ item }) => {
    const share = (item.amount / item.splitAmong.length).toFixed(2);
    const isPaidByMe = item.paidBy === user.uid;
    return (
      <View style={styles.expenseCard}>
        <View style={styles.expenseIcon}>
          <Text style={styles.expenseIconText}>💰</Text>
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseDesc}>{item.description}</Text>
          <Text style={styles.expenseSub}>
            {isPaidByMe ? 'You paid' : `${item.paidByName} paid`} · ₹{item.amount.toFixed(2)}
          </Text>
        </View>
        <View style={styles.expenseRight}>
          <Text style={isPaidByMe ? styles.amountGreen : styles.amountRed}>
            {isPaidByMe ? '+' : '-'}₹{share}
          </Text>
          <Text style={styles.amountSub}>
            {isPaidByMe ? 'you lent' : 'your share'}
          </Text>
        </View>
      </View>
    );
  }, [user.uid]);

  const balances = getBalances();
  const myBalance = balances.find(b => b.uid === user.uid);

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#6C63FF" style={styles.loader} />
      ) : (
        <>
          {myBalance && (
            <View style={styles.balanceBanner}>
              <Text style={styles.balanceLabel}>You owe</Text>
              <Text style={styles.balanceAmount}>₹{myBalance.owes.toFixed(2)}</Text>
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
    backgroundColor: '#6C63FF',
    padding: 20,
    alignItems: 'center',
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
  expenseCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  expenseIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f0eeff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expenseIconText: {
    fontSize: 20,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDesc: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  expenseSub: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  amountGreen: {
    fontSize: 15,
    fontWeight: '600',
    color: '#27ae60',
  },
  amountRed: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e74c3c',
  },
  amountSub: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 2,
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
});