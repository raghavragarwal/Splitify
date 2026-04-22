import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://api.exchangerate-api.com/v4/latest/INR';
const CACHE_KEY = 'exchange_rates';
const CACHE_DURATION = 1000 * 60 * 60;

export async function getExchangeRates() {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const { rates, timestamp } = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > CACHE_DURATION;
      if (!isExpired) {
        console.log('Using cached exchange rates');
        return rates;
      }
    }
    console.log('Fetching fresh exchange rates');
    const response = await axios.get(BASE_URL);
    const rates = response.data.rates;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
      rates,
      timestamp: Date.now(),
    }));
    return rates;
  } catch (err) {
    console.log('Failed to fetch rates, using fallback');
    return { INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0095 };
  }
}

export function convertAmount(amount, fromCurrency, toCurrency, rates) {
  if (fromCurrency === toCurrency) return amount;
  if (!rates) return amount;
  const inINR = fromCurrency === 'INR' ? amount : amount / rates[fromCurrency];
  return inINR * rates[toCurrency];
}