// firestoreDB.js
import { Firestore } from '@google-cloud/firestore';

export const db = new Firestore();
export const playersRef = db.collection('players');
