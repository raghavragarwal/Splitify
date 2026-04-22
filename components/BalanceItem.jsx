import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const BalanceItem = ({ name, amount, currency, index }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const symbol = currency === 'INR' ? '₹'
    : currency === 'USD' ? '$'
    : currency === 'EUR' ? '€' : '£';

  const isOwed = amount > 0;

  return (
    <Animated.View style={[
      styles.card,
      { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
    ]}>
      <View style={[styles.dot, isOwed ? styles.dotGreen : styles.dotRed]} />
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.sub}>
          {isOwed ? 'owes you' : 'you owe'}
        </Text>
      </View>
      <Text style={[styles.amount, isOwed ? styles.green : styles.red]}>
        {isOwed ? '+' : '-'}{symbol}{Math.abs(amount).toFixed(2)}
      </Text>
    </Animated.View>
  );
};

export default BalanceItem;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  dotGreen: {
    backgroundColor: '#27ae60',
  },
  dotRed: {
    backgroundColor: '#e74c3c',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  sub: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  green: {
    color: '#27ae60',
  },
  red: {
    color: '#e74c3c',
  },
});