import { Category, IngredientLibrary, IngredientRef, Venue } from '@/types'
import { foodDatabaseLibrary } from '@/lib/data/foodDatabase'

export const mockVenue: Venue = {
  id: '1',
  name: 'Кофейня «Утро»',
  slug: 'utro',
  address: 'ул. Пушкина, 12',
  description: 'Уютная кофейня с авторскими завтраками',
  workingHours: 'до 22:00',
  tags: ['Кофе', 'Завтраки', 'Веган'],
}

export const mockCategories: Category[] = [
  { id: 'drinks-classic', name: 'Кофе — классика',    venueId: '1', order: 1, items: [] },
  { id: 'drinks-author',  name: 'Авторские напитки',  venueId: '1', order: 2, items: [] },
  { id: 'drinks-tea',     name: 'Чай и холодные',     venueId: '1', order: 3, items: [] },
  { id: 'food-tortilla',  name: 'Тортилья',           venueId: '1', order: 4, items: [] },
  { id: 'food-bowl',      name: 'Боул',               venueId: '1', order: 5, items: [] },
  { id: 'food-main',      name: 'Основные блюда',     venueId: '1', order: 6, items: [] },
  { id: 'food-breakfast', name: 'Завтраки',           venueId: '1', order: 7, items: [] },
  { id: 'food-kids',      name: 'Детское меню',       venueId: '1', order: 8, items: [] },
  { id: 'sweets',         name: 'Десерты',            venueId: '1', order: 9, items: [] },
]

export const mockIngredients: IngredientRef[] = [
  // ─── МЯСО ───────────────────────────────────────────────────────────────
  { id: 'ing-lamb-1', name: 'Баранина 1 категория', unit: 'г', caloriesPer100: 209, proteinPer100: 15.6, fatPer100: 16.3, carbsPer100: 0, category: 'Мясо' },
  { id: 'ing-lamb-2', name: 'Баранина 2 категория', unit: 'г', caloriesPer100: 166, proteinPer100: 19.8, fatPer100: 9.6, carbsPer100: 0, category: 'Мясо' },
  { id: 'ing-beef-1', name: 'Говядина 1 категория', unit: 'г', caloriesPer100: 218, proteinPer100: 18.6, fatPer100: 16.0, carbsPer100: 0, category: 'Мясо' },
  { id: 'ing-beef-2', name: 'Говядина 2 категория', unit: 'г', caloriesPer100: 168, proteinPer100: 20.0, fatPer100: 9.8, carbsPer100: 0, category: 'Мясо' },
  { id: 'ing-horse-1', name: 'Конина 1 категория', unit: 'г', caloriesPer100: 167, proteinPer100: 19.5, fatPer100: 9.9, carbsPer100: 0, category: 'Мясо' },
  { id: 'ing-horse-2', name: 'Конина 2 категория', unit: 'г', caloriesPer100: 121, proteinPer100: 20.9, fatPer100: 4.1, carbsPer100: 0, category: 'Мясо' },
  { id: 'ing-rabbit', name: 'Кролик', unit: 'г', caloriesPer100: 183, proteinPer100: 21.2, fatPer100: 11.0, carbsPer100: 0, category: 'Мясо' },
  { id: 'ing-venison', name: 'Оленина', unit: 'г', caloriesPer100: 155, proteinPer100: 19.5, fatPer100: 8.5, carbsPer100: 0, category: 'Мясо' },
  { id: 'ing-pork-bacon', name: 'Свинина беконная', unit: 'г', caloriesPer100: 318, proteinPer100: 17.0, fatPer100: 27.8, carbsPer100: 0, category: 'Мясо' },
  { id: 'ing-pork-fat', name: 'Свинина жирная', unit: 'г', caloriesPer100: 491, proteinPer100: 11.7, fatPer100: 49.3, carbsPer100: 0, category: 'Мясо' },
  { id: 'ing-pork-meat', name: 'Свинина мясная', unit: 'г', caloriesPer100: 357, proteinPer100: 14.3, fatPer100: 33.3, carbsPer100: 0, category: 'Мясо' },
  { id: 'ing-veal-1', name: 'Телятина 1 категория', unit: 'г', caloriesPer100: 97, proteinPer100: 19.7, fatPer100: 2.0, carbsPer100: 0, category: 'Мясо' },
  { id: 'ing-veal-2', name: 'Телятина 2 категория', unit: 'г', caloriesPer100: 89, proteinPer100: 20.4, fatPer100: 0.9, carbsPer100: 0, category: 'Мясо' },

  // ─── ПТИЦА ───────────────────────────────────────────────────────────────
  { id: 'ing-broiler-1', name: 'Бройлеры 1 категория', unit: 'г', caloriesPer100: 220, proteinPer100: 18.7, fatPer100: 16.1, carbsPer100: 0, category: 'Птица' },
  { id: 'ing-broiler-2', name: 'Бройлеры 2 категория', unit: 'г', caloriesPer100: 180, proteinPer100: 19.7, fatPer100: 11.2, carbsPer100: 0, category: 'Птица' },
  { id: 'ing-goose-1', name: 'Гусь 1 категория', unit: 'г', caloriesPer100: 412, proteinPer100: 15.2, fatPer100: 39.0, carbsPer100: 0, category: 'Птица' },
  { id: 'ing-goose-2', name: 'Гусь 2 категория', unit: 'г', caloriesPer100: 317, proteinPer100: 17.0, fatPer100: 27.7, carbsPer100: 0, category: 'Птица' },
  { id: 'ing-turkey-1', name: 'Индейка 1 категория', unit: 'г', caloriesPer100: 276, proteinPer100: 19.5, fatPer100: 22.0, carbsPer100: 0, category: 'Птица' },
  { id: 'ing-turkey-2', name: 'Индейка 2 категория', unit: 'г', caloriesPer100: 194, proteinPer100: 21.6, fatPer100: 12.0, carbsPer100: 0, category: 'Птица' },
  { id: 'ing-chicken-1', name: 'Курица 1 категория', unit: 'г', caloriesPer100: 238, proteinPer100: 18.2, fatPer100: 18.4, carbsPer100: 0, category: 'Птица' },
  { id: 'ing-chicken-2', name: 'Курица 2 категория', unit: 'г', caloriesPer100: 159, proteinPer100: 21.2, fatPer100: 8.2, carbsPer100: 0, category: 'Птица' },
  { id: 'ing-duck-1', name: 'Утка 1 категория', unit: 'г', caloriesPer100: 405, proteinPer100: 15.8, fatPer100: 38.0, carbsPer100: 0, category: 'Птица' },
  { id: 'ing-duck-2', name: 'Утка 2 категория', unit: 'г', caloriesPer100: 287, proteinPer100: 17.2, fatPer100: 24.2, carbsPer100: 0, category: 'Птица' },

  // ─── РЫБА ────────────────────────────────────────────────────────────────
  { id: 'ing-pink-salmon', name: 'Горбуша', unit: 'г', caloriesPer100: 140, proteinPer100: 20.5, fatPer100: 6.5, carbsPer100: 0, category: 'Рыба' },
  { id: 'ing-cod', name: 'Треска', unit: 'г', caloriesPer100: 69, proteinPer100: 16.0, fatPer100: 0.6, carbsPer100: 0, category: 'Рыба' },
  { id: 'ing-pollock', name: 'Минтай', unit: 'г', caloriesPer100: 72, proteinPer100: 15.9, fatPer100: 0.9, carbsPer100: 0, category: 'Рыба' },
  { id: 'ing-mackerel', name: 'Скумбрия', unit: 'г', caloriesPer100: 191, proteinPer100: 18.0, fatPer100: 13.2, carbsPer100: 0, category: 'Рыба' },
  { id: 'ing-horse-mackerel', name: 'Ставрида', unit: 'г', caloriesPer100: 114, proteinPer100: 18.5, fatPer100: 4.5, carbsPer100: 0, category: 'Рыба' },
  { id: 'ing-sprat', name: 'Килька балтийская', unit: 'г', caloriesPer100: 137, proteinPer100: 14.1, fatPer100: 9.0, carbsPer100: 0, category: 'Рыба' },
  { id: 'ing-salmon', name: 'Лосось атлантический', unit: 'г', caloriesPer100: 153, proteinPer100: 20.0, fatPer100: 8.1, carbsPer100: 0, category: 'Рыба' },
  { id: 'ing-pike-perch', name: 'Судак', unit: 'г', caloriesPer100: 84, proteinPer100: 18.4, fatPer100: 1.1, carbsPer100: 0, category: 'Рыба' },
  { id: 'ing-pike', name: 'Щука', unit: 'г', caloriesPer100: 84, proteinPer100: 18.8, fatPer100: 1.1, carbsPer100: 0, category: 'Рыба' },
  { id: 'ing-carp', name: 'Карп', unit: 'г', caloriesPer100: 112, proteinPer100: 16.0, fatPer100: 5.3, carbsPer100: 0, category: 'Рыба' },
  { id: 'ing-herring', name: 'Сельдь атлантическая', unit: 'г', caloriesPer100: 161, proteinPer100: 17.7, fatPer100: 9.7, carbsPer100: 0, category: 'Рыба' },
  { id: 'ing-hake', name: 'Хек', unit: 'г', caloriesPer100: 86, proteinPer100: 16.6, fatPer100: 2.2, carbsPer100: 0, category: 'Рыба' },
  { id: 'ing-flounder', name: 'Камбала', unit: 'г', caloriesPer100: 83, proteinPer100: 15.7, fatPer100: 2.6, carbsPer100: 0, category: 'Рыба' },
  { id: 'ing-crucian', name: 'Карась', unit: 'г', caloriesPer100: 87, proteinPer100: 17.7, fatPer100: 1.8, carbsPer100: 0, category: 'Рыба' },
  { id: 'ing-perch', name: 'Окунь речной', unit: 'г', caloriesPer100: 82, proteinPer100: 18.5, fatPer100: 0.9, carbsPer100: 0, category: 'Рыба' },

  // ─── ЯЙЦА И МОЛОЧНОЕ ─────────────────────────────────────────────────────
  { id: 'ing-egg-chicken', name: 'Яйцо куриное', unit: 'г', caloriesPer100: 157, proteinPer100: 12.7, fatPer100: 11.5, carbsPer100: 0.7, category: 'Яйца и молочное' },
  { id: 'ing-milk-15', name: 'Молоко 1.5%', unit: 'мл', caloriesPer100: 45, proteinPer100: 3.0, fatPer100: 1.5, carbsPer100: 4.8, category: 'Яйца и молочное' },
  { id: 'ing-milk-25', name: 'Молоко 2.5%', unit: 'мл', caloriesPer100: 54, proteinPer100: 2.9, fatPer100: 2.5, carbsPer100: 4.8, category: 'Яйца и молочное' },
  { id: 'ing-milk-32', name: 'Молоко 3.2%', unit: 'мл', caloriesPer100: 60, proteinPer100: 2.9, fatPer100: 3.2, carbsPer100: 4.7, category: 'Яйца и молочное' },
  { id: 'ing-cream-10', name: 'Сливки 10%', unit: 'мл', caloriesPer100: 119, proteinPer100: 3.0, fatPer100: 10.0, carbsPer100: 4.0, category: 'Яйца и молочное' },
  { id: 'ing-cream-20', name: 'Сливки 20%', unit: 'мл', caloriesPer100: 207, proteinPer100: 2.8, fatPer100: 20.0, carbsPer100: 3.7, category: 'Яйца и молочное' },
  { id: 'ing-cream-35', name: 'Сливки 35%', unit: 'мл', caloriesPer100: 337, proteinPer100: 2.5, fatPer100: 35.0, carbsPer100: 3.2, category: 'Яйца и молочное' },
  { id: 'ing-cottage-fat', name: 'Творог 9% (полужирный)', unit: 'г', caloriesPer100: 159, proteinPer100: 16.7, fatPer100: 9.0, carbsPer100: 2.0, category: 'Яйца и молочное' },
  { id: 'ing-cottage-low', name: 'Творог нежирный', unit: 'г', caloriesPer100: 110, proteinPer100: 22.0, fatPer100: 0.6, carbsPer100: 3.3, category: 'Яйца и молочное' },
  { id: 'ing-sour-cream-15', name: 'Сметана 15%', unit: 'г', caloriesPer100: 158, proteinPer100: 2.6, fatPer100: 15.0, carbsPer100: 3.0, category: 'Яйца и молочное' },
  { id: 'ing-sour-cream-20', name: 'Сметана 20%', unit: 'г', caloriesPer100: 206, proteinPer100: 2.5, fatPer100: 20.0, carbsPer100: 3.2, category: 'Яйца и молочное' },
  { id: 'ing-kefir-15', name: 'Кефир 1.5%', unit: 'мл', caloriesPer100: 41, proteinPer100: 3.3, fatPer100: 1.5, carbsPer100: 4.1, category: 'Яйца и молочное' },
  { id: 'ing-kefir-32', name: 'Кефир 3.2%', unit: 'мл', caloriesPer100: 56, proteinPer100: 2.8, fatPer100: 3.2, carbsPer100: 4.1, category: 'Яйца и молочное' },

  // ─── МАСЛА И ЖИРЫ ────────────────────────────────────────────────────────
  { id: 'ing-butter', name: 'Масло сливочное', unit: 'г', caloriesPer100: 748, proteinPer100: 0.8, fatPer100: 82.5, carbsPer100: 0.8, category: 'Масла' },
  { id: 'ing-butter-ghee', name: 'Масло топлёное', unit: 'г', caloriesPer100: 892, proteinPer100: 0, fatPer100: 99.0, carbsPer100: 0, category: 'Масла' },
  { id: 'ing-sunflower-oil', name: 'Масло подсолнечное', unit: 'мл', caloriesPer100: 899, proteinPer100: 0, fatPer100: 99.9, carbsPer100: 0, category: 'Масла' },
  { id: 'ing-olive-oil', name: 'Масло оливковое', unit: 'мл', caloriesPer100: 898, proteinPer100: 0, fatPer100: 99.8, carbsPer100: 0, category: 'Масла' },
  { id: 'ing-corn-oil', name: 'Масло кукурузное', unit: 'мл', caloriesPer100: 899, proteinPer100: 0, fatPer100: 99.9, carbsPer100: 0, category: 'Масла' },
  { id: 'ing-linseed-oil', name: 'Масло льняное', unit: 'мл', caloriesPer100: 898, proteinPer100: 0, fatPer100: 99.8, carbsPer100: 0, category: 'Масла' },

  // ─── КРУПЫ И МУКА ────────────────────────────────────────────────────────
  { id: 'ing-buckwheat-raw', name: 'Гречневая крупа (ядрица)', unit: 'г', caloriesPer100: 329, proteinPer100: 12.6, fatPer100: 3.3, carbsPer100: 57.1, category: 'Крупы и мука' },
  { id: 'ing-oat', name: 'Крупа овсяная', unit: 'г', caloriesPer100: 345, proteinPer100: 12.0, fatPer100: 5.8, carbsPer100: 61.8, category: 'Крупы и мука' },
  { id: 'ing-rice', name: 'Крупа рисовая', unit: 'г', caloriesPer100: 330, proteinPer100: 7.0, fatPer100: 1.0, carbsPer100: 72.9, category: 'Крупы и мука' },
  { id: 'ing-millet', name: 'Крупа пшённая', unit: 'г', caloriesPer100: 334, proteinPer100: 11.5, fatPer100: 3.3, carbsPer100: 66.5, category: 'Крупы и мука' },
  { id: 'ing-semolina', name: 'Крупа манная', unit: 'г', caloriesPer100: 328, proteinPer100: 10.3, fatPer100: 1.0, carbsPer100: 70.6, category: 'Крупы и мука' },
  { id: 'ing-barley', name: 'Крупа ячневая', unit: 'г', caloriesPer100: 322, proteinPer100: 10.4, fatPer100: 1.3, carbsPer100: 66.3, category: 'Крупы и мука' },
  { id: 'ing-pearl-barley', name: 'Перловая крупа', unit: 'г', caloriesPer100: 324, proteinPer100: 9.3, fatPer100: 1.1, carbsPer100: 66.9, category: 'Крупы и мука' },
  { id: 'ing-corn-grits', name: 'Крупа кукурузная', unit: 'г', caloriesPer100: 337, proteinPer100: 8.3, fatPer100: 1.2, carbsPer100: 71.0, category: 'Крупы и мука' },
  { id: 'ing-wheat-flour', name: 'Мука пшеничная в/с', unit: 'г', caloriesPer100: 334, proteinPer100: 10.3, fatPer100: 1.1, carbsPer100: 68.9, category: 'Крупы и мука' },
  { id: 'ing-rye-flour', name: 'Мука ржаная', unit: 'г', caloriesPer100: 298, proteinPer100: 6.9, fatPer100: 1.1, carbsPer100: 61.8, category: 'Крупы и мука' },
  { id: 'ing-oatmeal', name: 'Толокно овсяное', unit: 'г', caloriesPer100: 357, proteinPer100: 12.5, fatPer100: 5.8, carbsPer100: 65.7, category: 'Крупы и мука' },

  // ─── БОБОВЫЕ ─────────────────────────────────────────────────────────────
  { id: 'ing-lentil', name: 'Чечевица', unit: 'г', caloriesPer100: 295, proteinPer100: 24.0, fatPer100: 1.5, carbsPer100: 46.3, category: 'Бобовые' },
  { id: 'ing-chickpea', name: 'Нут', unit: 'г', caloriesPer100: 309, proteinPer100: 19.0, fatPer100: 4.5, carbsPer100: 46.2, category: 'Бобовые' },
  { id: 'ing-peas', name: 'Горох', unit: 'г', caloriesPer100: 298, proteinPer100: 23.0, fatPer100: 1.6, carbsPer100: 46.5, category: 'Бобовые' },
  { id: 'ing-kidney-beans', name: 'Фасоль', unit: 'г', caloriesPer100: 292, proteinPer100: 22.3, fatPer100: 1.7, carbsPer100: 46.0, category: 'Бобовые' },
  { id: 'ing-soybean', name: 'Соя', unit: 'г', caloriesPer100: 364, proteinPer100: 34.9, fatPer100: 17.3, carbsPer100: 17.3, category: 'Бобовые' },

  // ─── ОВОЩИ ───────────────────────────────────────────────────────────────
  { id: 'ing-potato', name: 'Картофель', unit: 'г', caloriesPer100: 77, proteinPer100: 2.0, fatPer100: 0.1, carbsPer100: 16.3, category: 'Овощи' },
  { id: 'ing-carrot', name: 'Морковь', unit: 'г', caloriesPer100: 35, proteinPer100: 1.3, fatPer100: 0.1, carbsPer100: 6.9, category: 'Овощи' },
  { id: 'ing-beet', name: 'Свёкла', unit: 'г', caloriesPer100: 48, proteinPer100: 1.7, fatPer100: 0.1, carbsPer100: 9.6, category: 'Овощи' },
  { id: 'ing-cabbage-white', name: 'Капуста белокочанная', unit: 'г', caloriesPer100: 28, proteinPer100: 1.8, fatPer100: 0.1, carbsPer100: 4.7, category: 'Овощи' },
  { id: 'ing-onion', name: 'Лук репчатый', unit: 'г', caloriesPer100: 41, proteinPer100: 1.4, fatPer100: 0.2, carbsPer100: 8.2, category: 'Овощи' },
  { id: 'ing-tomato', name: 'Томаты', unit: 'г', caloriesPer100: 24, proteinPer100: 1.1, fatPer100: 0.2, carbsPer100: 3.8, category: 'Овощи' },
  { id: 'ing-cucumber', name: 'Огурцы', unit: 'г', caloriesPer100: 14, proteinPer100: 0.8, fatPer100: 0.1, carbsPer100: 2.1, category: 'Овощи' },
  { id: 'ing-bell-pepper', name: 'Перец сладкий', unit: 'г', caloriesPer100: 27, proteinPer100: 1.3, fatPer100: 0.1, carbsPer100: 5.7, category: 'Овощи' },
  { id: 'ing-eggplant', name: 'Баклажаны', unit: 'г', caloriesPer100: 24, proteinPer100: 1.2, fatPer100: 0.1, carbsPer100: 4.5, category: 'Овощи' },
  { id: 'ing-zucchini', name: 'Кабачки', unit: 'г', caloriesPer100: 24, proteinPer100: 0.6, fatPer100: 0.3, carbsPer100: 4.6, category: 'Овощи' },
  { id: 'ing-garlic', name: 'Чеснок', unit: 'г', caloriesPer100: 106, proteinPer100: 6.5, fatPer100: 0.5, carbsPer100: 21.2, category: 'Овощи' },
  { id: 'ing-spinach', name: 'Шпинат', unit: 'г', caloriesPer100: 23, proteinPer100: 2.9, fatPer100: 0.3, carbsPer100: 2.3, category: 'Овощи' },
  { id: 'ing-green-peas', name: 'Горошек зелёный свежий', unit: 'г', caloriesPer100: 73, proteinPer100: 5.0, fatPer100: 0.2, carbsPer100: 13.3, category: 'Овощи' },
  { id: 'ing-pumpkin', name: 'Тыква', unit: 'г', caloriesPer100: 28, proteinPer100: 1.3, fatPer100: 0.3, carbsPer100: 4.9, category: 'Овощи' },
  { id: 'ing-leek', name: 'Лук-порей', unit: 'г', caloriesPer100: 40, proteinPer100: 2.0, fatPer100: 0.2, carbsPer100: 7.3, category: 'Овощи' },
  { id: 'ing-celery-root', name: 'Сельдерей (корень)', unit: 'г', caloriesPer100: 32, proteinPer100: 1.3, fatPer100: 0.3, carbsPer100: 6.5, category: 'Овощи' },
  { id: 'ing-parsnip', name: 'Пастернак', unit: 'г', caloriesPer100: 74, proteinPer100: 1.4, fatPer100: 0.5, carbsPer100: 15.6, category: 'Овощи' },
  { id: 'ing-radish', name: 'Редис', unit: 'г', caloriesPer100: 21, proteinPer100: 1.2, fatPer100: 0.1, carbsPer100: 3.4, category: 'Овощи' },
  { id: 'ing-broccoli', name: 'Брокколи', unit: 'г', caloriesPer100: 28, proteinPer100: 3.0, fatPer100: 0.4, carbsPer100: 2.2, category: 'Овощи' },
  { id: 'ing-cauliflower', name: 'Капуста цветная', unit: 'г', caloriesPer100: 30, proteinPer100: 2.5, fatPer100: 0.3, carbsPer100: 4.2, category: 'Овощи' },

  // ─── ФРУКТЫ И ЯГОДЫ ──────────────────────────────────────────────────────
  { id: 'ing-apple', name: 'Яблоки', unit: 'г', caloriesPer100: 46, proteinPer100: 0.4, fatPer100: 0.4, carbsPer100: 9.8, category: 'Фрукты' },
  { id: 'ing-pear', name: 'Груши', unit: 'г', caloriesPer100: 47, proteinPer100: 0.4, fatPer100: 0.3, carbsPer100: 10.3, category: 'Фрукты' },
  { id: 'ing-orange', name: 'Апельсины', unit: 'г', caloriesPer100: 43, proteinPer100: 0.9, fatPer100: 0.2, carbsPer100: 8.4, category: 'Фрукты' },
  { id: 'ing-tangerine', name: 'Мандарины', unit: 'г', caloriesPer100: 40, proteinPer100: 0.8, fatPer100: 0.3, carbsPer100: 7.5, category: 'Фрукты' },
  { id: 'ing-banana', name: 'Бананы', unit: 'г', caloriesPer100: 91, proteinPer100: 1.5, fatPer100: 0.2, carbsPer100: 21.8, category: 'Фрукты' },
  { id: 'ing-grape', name: 'Виноград', unit: 'г', caloriesPer100: 65, proteinPer100: 0.6, fatPer100: 0.2, carbsPer100: 15.0, category: 'Фрукты' },
  { id: 'ing-peach', name: 'Персики', unit: 'г', caloriesPer100: 44, proteinPer100: 0.9, fatPer100: 0.1, carbsPer100: 9.5, category: 'Фрукты' },
  { id: 'ing-plum', name: 'Слива', unit: 'г', caloriesPer100: 49, proteinPer100: 0.8, fatPer100: 0.3, carbsPer100: 9.9, category: 'Фрукты' },
  { id: 'ing-cherry', name: 'Черешня', unit: 'г', caloriesPer100: 52, proteinPer100: 1.1, fatPer100: 0.4, carbsPer100: 10.6, category: 'Фрукты' },
  { id: 'ing-sour-cherry', name: 'Вишня', unit: 'г', caloriesPer100: 52, proteinPer100: 0.8, fatPer100: 0.5, carbsPer100: 10.6, category: 'Фрукты' },
  { id: 'ing-strawberry', name: 'Клубника', unit: 'г', caloriesPer100: 41, proteinPer100: 1.8, fatPer100: 0.4, carbsPer100: 6.3, category: 'Фрукты' },
  { id: 'ing-blueberry', name: 'Черника', unit: 'г', caloriesPer100: 44, proteinPer100: 1.1, fatPer100: 0.6, carbsPer100: 6.6, category: 'Фрукты' },
  { id: 'ing-raspberry', name: 'Малина', unit: 'г', caloriesPer100: 46, proteinPer100: 0.8, fatPer100: 0.5, carbsPer100: 8.3, category: 'Фрукты' },
  { id: 'ing-currant-black', name: 'Смородина чёрная', unit: 'г', caloriesPer100: 44, proteinPer100: 1.0, fatPer100: 0.2, carbsPer100: 7.3, category: 'Фрукты' },
  { id: 'ing-watermelon', name: 'Арбуз', unit: 'г', caloriesPer100: 38, proteinPer100: 0.7, fatPer100: 0.2, carbsPer100: 7.9, category: 'Фрукты' },
  { id: 'ing-melon', name: 'Дыня', unit: 'г', caloriesPer100: 35, proteinPer100: 0.6, fatPer100: 0.3, carbsPer100: 7.4, category: 'Фрукты' },
  { id: 'ing-lemon', name: 'Лимон', unit: 'г', caloriesPer100: 34, proteinPer100: 0.9, fatPer100: 0.1, carbsPer100: 3.6, category: 'Фрукты' },
  { id: 'ing-apricot', name: 'Абрикосы', unit: 'г', caloriesPer100: 44, proteinPer100: 0.9, fatPer100: 0.1, carbsPer100: 9.0, category: 'Фрукты' },
]

/**
 * Системные библиотеки от сервиса NutriMenu.
 * Подключаются через initLibraries() и доступны только для чтения владельцем.
 */
export const systemLibraries: IngredientLibrary[] = [
  foodDatabaseLibrary,
]