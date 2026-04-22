import { Stack } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';

export default function MainLayout() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.replace('/(auth)/login');
  };

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#6C63FF' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Splitify',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginRight: 16 }}>
              <TouchableOpacity onPress={() => router.push('/(main)/profile')}>
                <Ionicons name="person-outline" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="profile"
        options={{ title: 'My Profile' }}
      />
    </Stack>
  );
}