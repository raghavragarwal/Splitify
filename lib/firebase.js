import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyBr7nqghflSZUVkKS0_LjSeC-IF_oNWiLU",
  authDomain: "splitify-be5fd.firebaseapp.com",
  projectId: "splitify-be5fd",
  storageBucket: "splitify-be5fd.firebasestorage.app",
  messagingSenderId: "886780708714",
  appId: "1:886780708714:web:bad7d81f6e5078c58b8713"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);