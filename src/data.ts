import { Vegetable, Sale } from './types';

export const DEFAULT_VEGETABLES: Vegetable[] = [
  { id: '1', name: 'Tomato', defaultPrice: 40, category: 'fleshy', imageEmoji: '🍅' },
  { id: '2', name: 'Potato', defaultPrice: 30, category: 'roots', imageEmoji: '🥔' },
  { id: '3', name: 'Onion', defaultPrice: 35, category: 'roots', imageEmoji: '🧅' },
  { id: '4', name: 'Spinach', defaultPrice: 20, category: 'leafy', imageEmoji: '🥬' },
  { id: '5', name: 'Cauliflower', defaultPrice: 45, category: 'other', imageEmoji: '🥦' },
  { id: '6', name: 'Carrot', defaultPrice: 50, category: 'roots', imageEmoji: '🥕' },
  { id: '7', name: 'Garlic', defaultPrice: 120, category: 'other', imageEmoji: '🧄' },
  { id: '8', name: 'Ginger', defaultPrice: 150, category: 'other', imageEmoji: '🫚' },
  { id: '9', name: 'Green Chilli', defaultPrice: 80, category: 'other', imageEmoji: '🌶️' },
  { id: '10', name: 'Coriander', defaultPrice: 15, category: 'leafy', imageEmoji: '🌿' },
  { id: '11', name: 'Lemon', defaultPrice: 60, category: 'other', imageEmoji: '🍋' },
  { id: '12', name: 'Cabbage', defaultPrice: 25, category: 'leafy', imageEmoji: '🥬' },
  { id: '13', name: 'Fenugreek', defaultPrice: 25, category: 'leafy', imageEmoji: '🌿' },
  { id: '14', name: 'Eggplant', defaultPrice: 40, category: 'fleshy', imageEmoji: '🍆' },
  { id: '15', name: 'Okra', defaultPrice: 50, category: 'fleshy', imageEmoji: '🫛' },
  { id: '16', name: 'Bottle Gourd', defaultPrice: 30, category: 'fleshy', imageEmoji: '🥒' },
  { id: '17', name: 'Ridge Gourd', defaultPrice: 50, category: 'fleshy', imageEmoji: '🥒' },
  { id: '18', name: 'Bitter Gourd', defaultPrice: 60, category: 'fleshy', imageEmoji: '🥒' },
  { id: '19', name: 'Cucumber', defaultPrice: 40, category: 'fleshy', imageEmoji: '🥒' },
  { id: '20', name: 'Capsicum', defaultPrice: 60, category: 'fleshy', imageEmoji: '🫑' },
  { id: '21', name: 'Green Peas', defaultPrice: 80, category: 'other', imageEmoji: '🫛' },
  { id: '22', name: 'Pumpkin', defaultPrice: 30, category: 'fleshy', imageEmoji: '🎃' },
  { id: '23', name: 'Radish', defaultPrice: 30, category: 'roots', imageEmoji: '🥕' },
  { id: '24', name: 'Beetroot', defaultPrice: 40, category: 'roots', imageEmoji: '🍠' },
  { id: '25', name: 'Drumstick', defaultPrice: 80, category: 'other', imageEmoji: '🪵' },
  { id: '26', name: 'Sweet Potato', defaultPrice: 50, category: 'roots', imageEmoji: '🍠' },
  { id: '27', name: 'Mint', defaultPrice: 15, category: 'leafy', imageEmoji: '🌿' },
  { id: '28', name: 'Curry Leaves', defaultPrice: 10, category: 'leafy', imageEmoji: '🌿' },
  { id: '29', name: 'Spring Onion', defaultPrice: 25, category: 'leafy', imageEmoji: '🧅' },
  { id: '30', name: 'Cluster Beans', defaultPrice: 60, category: 'other', imageEmoji: '🫛' },
  { id: '31', name: 'Sponge Gourd', defaultPrice: 45, category: 'fleshy', imageEmoji: '🥒' },
  { id: '32', name: 'Ivy Gourd', defaultPrice: 50, category: 'fleshy', imageEmoji: '🫛' },
  { id: '33', name: 'French Beans', defaultPrice: 70, category: 'other', imageEmoji: '🫛' },
  { id: '34', name: 'Dill Leaves', defaultPrice: 20, category: 'leafy', imageEmoji: '🌿' },
  { id: '35', name: 'Colocasia Leaves', defaultPrice: 30, category: 'leafy', imageEmoji: '🥬' },
  { id: '36', name: 'Amaranth', defaultPrice: 20, category: 'leafy', imageEmoji: '🥬' },
];

const todayStr = new Date().toISOString().split('T')[0];
const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const dayBeforeStr = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

export const SAMPLE_SALES: Sale[] = [];
