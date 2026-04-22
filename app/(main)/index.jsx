import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput, Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, addDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

export default function Home() {
  const { user } = useAuth() || {};
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'groups'),
      where('members', 'array-contains', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await addDoc(collection(db, 'groups'), {
        name: groupName.trim(),
        members: [user.uid],
        createdBy: user.uid,
        createdAt: new Date(),
        totalExpenses: 0,
      });
      setGroupName('');
      setModalVisible(false);
    } catch (err) {
      setError('Failed to create group');
    } finally {
      setCreating(false);
    }
  }, [groupName, user.uid]);

  const renderGroup = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => router.push(`/group/${item.id}`)}
    >
      <View style={styles.groupAvatar}>
        <Text style={styles.groupAvatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.groupSub}>
          {item.members.length} member{item.members.length !== 1 ? 's' : ''}
        </Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  ), []);

  return (
    <View style={styles.container}>

      {loading ? (
        <ActivityIndicator size="large" color="#6C63FF" style={styles.loader} />
      ) : groups.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💸</Text>
          <Text style={styles.emptyTitle}>No groups yet</Text>
          <Text style={styles.emptySub}>Create a group to start splitting expenses</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={item => item.id}
          renderItem={renderGroup}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
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
            <Text style={styles.modalTitle}>Create New Group</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Group name (e.g. Goa Trip)"
              placeholderTextColor="#999"
              value={groupName}
              onChangeText={setGroupName}
              autoFocus
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleCreateGroup}
              disabled={creating}
            >
              {creating
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.modalButtonText}>Create Group</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => {
              setModalVisible(false);
              setGroupName('');
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
  list: {
    padding: 16,
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  groupAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  groupAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  groupSub: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  arrow: {
    fontSize: 24,
    color: '#ccc',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
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