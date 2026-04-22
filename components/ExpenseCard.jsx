import { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';

const ExpenseCard = ({ item, userId, currency, rates, index }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const convertedAmount = useCallback(() => {
    if (!rates || currency === 'INR') return item.amount;
    return item.amount * rates[currency];
  }, [rates, currency, item.amount]);

  const convertedShare = useCallback(() => {
    const share = item.amount / item.splitAmong.length;
    if (!rates || currency === 'INR') return share;
    return share * rates[currency];
  }, [rates, currency, item.amount, item.splitAmong]);

  const isPaidByMe = item.paidBy === userId;
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';

  return (
    <Animated.View style={[
      styles.card,
      { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
    ]}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>💰</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.desc}>{item.description}</Text>
        <Text style={styles.sub}>
          {isPaidByMe ? 'You paid' : `${item.paidByName} paid`} · {symbol}{convertedAmount().toFixed(2)}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={isPaidByMe ? styles.green : styles.red}>
          {isPaidByMe ? '+' : '-'}{symbol}{convertedShare().toFixed(2)}
        </Text>
        <Text style={styles.rightSub}>
          {isPaidByMe ? 'you lent' : 'your share'}
        </Text>
      </View>
    </Animated.View>
  );
};

export default ExpenseCard;

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
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f0eeff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  desc: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  sub: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  green: {
    fontSize: 15,
    fontWeight: '600',
    color: '#27ae60',
  },
  red: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e74c3c',
  },
  rightSub: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 2,
  },
});