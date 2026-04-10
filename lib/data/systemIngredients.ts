import { IngredientRef } from '@/types'

export const systemIngredients: IngredientRef[] = [
  // --- БАЗОВАЯ БАКАЛЕЯ И СПЕЦИИ ---
  { id: 'sys-salt',             name: 'Соль поваренная',             category: 'Бакалея',                  unit: 'г',  caloriesPer100: 0,   proteinPer100: 0,    fatPer100: 0,    carbsPer100: 0,    isSystem: true },
  { id: 'sys-sugar-white',      name: 'Сахар белый',                 category: 'Бакалея',                  unit: 'г',  caloriesPer100: 387, proteinPer100: 0,    fatPer100: 0,    carbsPer100: 100,  isSystem: true },
  { id: 'sys-sugar-brown',      name: 'Сахар тростниковый',          category: 'Бакалея',                  unit: 'г',  caloriesPer100: 380, proteinPer100: 0.1,  fatPer100: 0,    carbsPer100: 98,   isSystem: true },
  { id: 'sys-honey',            name: 'Мед натуральный',             category: 'Бакалея',                  unit: 'г',  caloriesPer100: 304, proteinPer100: 0.3,  fatPer100: 0,    carbsPer100: 82.4, isSystem: true },
  { id: 'sys-soy-sauce',        name: 'Соевый соус',                 category: 'Соусы',                    unit: 'мл', caloriesPer100: 53,  proteinPer100: 8.1,  fatPer100: 0.6,  carbsPer100: 4.9,  isSystem: true },
  { id: 'sys-tomato-paste',     name: 'Томатная паста',              category: 'Соусы',                    unit: 'г',  caloriesPer100: 82,  proteinPer100: 4.3,  fatPer100: 0.5,  carbsPer100: 18.9, isSystem: true },
  { id: 'sys-vinegar-balsamic', name: 'Уксус бальзамический',        category: 'Бакалея',                  unit: 'мл', caloriesPer100: 88,  proteinPer100: 0.5,  fatPer100: 0,    carbsPer100: 17,   isSystem: true },
  { id: 'sys-vinegar-rice',     name: 'Уксус рисовый',               category: 'Бакалея',                  unit: 'мл', caloriesPer100: 18,  proteinPer100: 0.2,  fatPer100: 0,    carbsPer100: 4.1,  isSystem: true },

  // --- МАСЛА И ЖИРЫ ---
  { id: 'sys-oil-sunflower',    name: 'Масло подсолнечное',          category: 'Масла',                    unit: 'мл', caloriesPer100: 884, proteinPer100: 0,    fatPer100: 100,  carbsPer100: 0,    isSystem: true },
  { id: 'sys-oil-olive',        name: 'Масло оливковое (Extra Virgin)', category: 'Масла',                 unit: 'мл', caloriesPer100: 884, proteinPer100: 0,    fatPer100: 100,  carbsPer100: 0,    isSystem: true },
  { id: 'sys-oil-sesame',       name: 'Масло кунжутное',             category: 'Масла',                    unit: 'мл', caloriesPer100: 884, proteinPer100: 0,    fatPer100: 100,  carbsPer100: 0,    isSystem: true },
  { id: 'sys-butter-82',        name: 'Масло сливочное 82.5%',       category: 'Масла',                    unit: 'г',  caloriesPer100: 748, proteinPer100: 0.5,  fatPer100: 82.5, carbsPer100: 0.8,  isSystem: true },
  { id: 'sys-ghee',             name: 'Масло топленое (Гхи)',        category: 'Масла',                    unit: 'г',  caloriesPer100: 900, proteinPer100: 0,    fatPer100: 100,  carbsPer100: 0,    isSystem: true },

  // --- ОВОЩИ: ЛУК И ЧЕСНОК ---
  { id: 'sys-onion-yellow',     name: 'Лук репчатый',                category: 'Овощи',                    unit: 'г',  caloriesPer100: 40,  proteinPer100: 1.1,  fatPer100: 0.1,  carbsPer100: 9.3,  isSystem: true },
  { id: 'sys-onion-red',        name: 'Лук красный',                 category: 'Овощи',                    unit: 'г',  caloriesPer100: 42,  proteinPer100: 1.2,  fatPer100: 0.1,  carbsPer100: 9.3,  isSystem: true },
  { id: 'sys-onion-shallot',    name: 'Лук шалот',                   category: 'Овощи',                    unit: 'г',  caloriesPer100: 72,  proteinPer100: 2.5,  fatPer100: 0.1,  carbsPer100: 16.8, isSystem: true },
  { id: 'sys-onion-leek',       name: 'Лук-порей',                   category: 'Овощи',                    unit: 'г',  caloriesPer100: 61,  proteinPer100: 1.5,  fatPer100: 0.3,  carbsPer100: 14.2, isSystem: true },
  { id: 'sys-onion-green',      name: 'Лук зеленый (перо)',          category: 'Овощи',                    unit: 'г',  caloriesPer100: 32,  proteinPer100: 1.8,  fatPer100: 0.2,  carbsPer100: 7.3,  isSystem: true },
  { id: 'sys-garlic',           name: 'Чеснок',                      category: 'Овощи',                    unit: 'г',  caloriesPer100: 149, proteinPer100: 6.4,  fatPer100: 0.5,  carbsPer100: 33.1, isSystem: true },

  // --- ОВОЩИ: ТОМАТЫ И ПЕРЦЫ ---
  { id: 'sys-tomato-standard',  name: 'Томаты свежие',               category: 'Овощи',                    unit: 'г',  caloriesPer100: 18,  proteinPer100: 0.9,  fatPer100: 0.2,  carbsPer100: 3.9,  isSystem: true },
  { id: 'sys-tomato-cherry',    name: 'Томаты черри',                 category: 'Овощи',                    unit: 'г',  caloriesPer100: 22,  proteinPer100: 1,    fatPer100: 0.2,  carbsPer100: 4.8,  isSystem: true },
  { id: 'sys-tomato-sundried',  name: 'Томаты вяленые',              category: 'Овощи',                    unit: 'г',  caloriesPer100: 258, proteinPer100: 14.1, fatPer100: 3,    carbsPer100: 55.8, isSystem: true },
  { id: 'sys-pepper-bell',      name: 'Перец болгарский',            category: 'Овощи',                    unit: 'г',  caloriesPer100: 31,  proteinPer100: 1,    fatPer100: 0.3,  carbsPer100: 6,    isSystem: true },
  { id: 'sys-pepper-chili',     name: 'Перец чили свежий',           category: 'Овощи',                    unit: 'г',  caloriesPer100: 40,  proteinPer100: 1.9,  fatPer100: 0.4,  carbsPer100: 8.8,  isSystem: true },

  // --- ОВОЩИ И ЗЕЛЕНЬ ---
  { id: 'sys-potato',           name: 'Картофель',                   category: 'Овощи',                    unit: 'г',  caloriesPer100: 77,  proteinPer100: 2,    fatPer100: 0.1,  carbsPer100: 16.3, isSystem: true },
  { id: 'sys-ginger',           name: 'Имбирь корень свежий',        category: 'Овощи',                    unit: 'г',  caloriesPer100: 80,  proteinPer100: 1.8,  fatPer100: 0.8,  carbsPer100: 17.8, isSystem: true },
  { id: 'sys-avocado',          name: 'Авокадо (Хасс)',              category: 'Овощи',                    unit: 'г',  caloriesPer100: 160, proteinPer100: 2,    fatPer100: 14.7, carbsPer100: 8.5,  isSystem: true },
  { id: 'sys-lettuce-iceberg',  name: 'Салат Айсберг',               category: 'Зелень',                   unit: 'г',  caloriesPer100: 14,  proteinPer100: 0.9,  fatPer100: 0.1,  carbsPer100: 1.8,  isSystem: true },
  { id: 'sys-lettuce-romaine',  name: 'Салат Романо',                category: 'Зелень',                   unit: 'г',  caloriesPer100: 17,  proteinPer100: 1.2,  fatPer100: 0.3,  carbsPer100: 3.3,  isSystem: true },
  { id: 'sys-arugula',          name: 'Руккола',                     category: 'Зелень',                   unit: 'г',  caloriesPer100: 25,  proteinPer100: 2.6,  fatPer100: 0.7,  carbsPer100: 2.1,  isSystem: true },
  { id: 'sys-spinach',          name: 'Шпинат свежий',               category: 'Зелень',                   unit: 'г',  caloriesPer100: 23,  proteinPer100: 2.9,  fatPer100: 0.4,  carbsPer100: 3.6,  isSystem: true },
  { id: 'sys-cilantro',         name: 'Кинза свежая',                category: 'Зелень',                   unit: 'г',  caloriesPer100: 23,  proteinPer100: 2.1,  fatPer100: 0.5,  carbsPer100: 3.7,  isSystem: true },
  { id: 'sys-basil',            name: 'Базилик свежий',              category: 'Зелень',                   unit: 'г',  caloriesPer100: 23,  proteinPer100: 3.2,  fatPer100: 0.6,  carbsPer100: 2.7,  isSystem: true },

  // --- ГРИБЫ ---
  { id: 'sys-mushroom-button',  name: 'Шампиньоны свежие',           category: 'Грибы',                    unit: 'г',  caloriesPer100: 22,  proteinPer100: 3.1,  fatPer100: 0.3,  carbsPer100: 3.3,  isSystem: true },
  { id: 'sys-mushroom-oyster',  name: 'Вешенки свежие',              category: 'Грибы',                    unit: 'г',  caloriesPer100: 33,  proteinPer100: 3.3,  fatPer100: 0.4,  carbsPer100: 6,    isSystem: true },
  { id: 'sys-mushroom-shiitake',name: 'Шиитаке свежие',              category: 'Грибы',                    unit: 'г',  caloriesPer100: 34,  proteinPer100: 2.2,  fatPer100: 0.5,  carbsPer100: 6.8,  isSystem: true },

  // --- МОЛОЧНЫЕ И СЫРЫ ---
  { id: 'sys-cream-10',         name: 'Сливки 10%',                  category: 'Молочные',                 unit: 'мл', caloriesPer100: 119, proteinPer100: 3,    fatPer100: 10,   carbsPer100: 4,    isSystem: true },
  { id: 'sys-cream-33',         name: 'Сливки 33-35%',               category: 'Молочные',                 unit: 'мл', caloriesPer100: 322, proteinPer100: 2,    fatPer100: 33,   carbsPer100: 3,    isSystem: true },
  { id: 'sys-cheese-parmesan',  name: 'Сыр Пармезан',                category: 'Сыры',                     unit: 'г',  caloriesPer100: 431, proteinPer100: 38.5, fatPer100: 28.6, carbsPer100: 4.1,  isSystem: true },
  { id: 'sys-cheese-mozzarella',name: 'Сыр Моцарелла (полутвердая)', category: 'Сыры',                     unit: 'г',  caloriesPer100: 300, proteinPer100: 22.2, fatPer100: 22.1, carbsPer100: 2.2,  isSystem: true },
  { id: 'sys-cheese-feta',      name: 'Сыр Фета',                    category: 'Сыры',                     unit: 'г',  caloriesPer100: 264, proteinPer100: 14.2, fatPer100: 21.3, carbsPer100: 4.1,  isSystem: true },
  { id: 'sys-cheese-cream',     name: 'Сыр Творожный (Крем-чиз)',    category: 'Сыры',                     unit: 'г',  caloriesPer100: 342, proteinPer100: 5.9,  fatPer100: 34.2, carbsPer100: 4.1,  isSystem: true },

  // --- КРУПЫ, МУКА, ПАСТА (СУХИЕ) ---
  { id: 'sys-flour-wheat',      name: 'Мука пшеничная в/с',          category: 'Крупы и Мука',             unit: 'г',  caloriesPer100: 364, proteinPer100: 10.3, fatPer100: 1,    carbsPer100: 76.3, isSystem: true },
  { id: 'sys-rice-basmati',     name: 'Рис Басмати (сухой)',         category: 'Крупы и Мука',             unit: 'г',  caloriesPer100: 347, proteinPer100: 7.3,  fatPer100: 1.5,  carbsPer100: 75.4, isSystem: true },
  { id: 'sys-rice-arborio',     name: 'Рис Арборио (сухой)',         category: 'Крупы и Мука',             unit: 'г',  caloriesPer100: 330, proteinPer100: 7.3,  fatPer100: 1.2,  carbsPer100: 73,   isSystem: true },
  { id: 'sys-quinoa',           name: 'Киноа (сухая)',               category: 'Крупы и Мука',             unit: 'г',  caloriesPer100: 368, proteinPer100: 14.1, fatPer100: 6.1,  carbsPer100: 64.2, isSystem: true },
  { id: 'sys-bulgur',           name: 'Булгур (сухой)',              category: 'Крупы и Мука',             unit: 'г',  caloriesPer100: 342, proteinPer100: 12.3, fatPer100: 1.3,  carbsPer100: 63.4, isSystem: true },
  { id: 'sys-pasta',            name: 'Паста / Макароны (сухие)',    category: 'Крупы и Мука',             unit: 'г',  caloriesPer100: 371, proteinPer100: 13,   fatPer100: 1.5,  carbsPer100: 74.7, isSystem: true },
  { id: 'sys-udon',             name: 'Лапша Удон (сухая)',          category: 'Крупы и Мука',             unit: 'г',  caloriesPer100: 338, proteinPer100: 10.4, fatPer100: 1.1,  carbsPer100: 71.3, isSystem: true },

  // --- ПРОТЕИНЫ (СЫРЫЕ) ---
  { id: 'sys-chicken-breast',   name: 'Куриное филе (грудка сырая)', category: 'Мясо и Птица',             unit: 'г',  caloriesPer100: 120, proteinPer100: 22.5, fatPer100: 2.6,  carbsPer100: 0,    isSystem: true },
  { id: 'sys-chicken-thigh',    name: 'Куриное бедро б/к (сырое)',   category: 'Мясо и Птица',             unit: 'г',  caloriesPer100: 177, proteinPer100: 17,   fatPer100: 11.5, carbsPer100: 0,    isSystem: true },
  { id: 'sys-beef-tenderloin',  name: 'Говядина вырезка (сырая)',    category: 'Мясо и Птица',             unit: 'г',  caloriesPer100: 133, proteinPer100: 21.4, fatPer100: 4.5,  carbsPer100: 0,    isSystem: true },
  { id: 'sys-salmon-fillet',    name: 'Лосось филе (сырое)',         category: 'Рыба и Морепродукты',      unit: 'г',  caloriesPer100: 208, proteinPer100: 20.4, fatPer100: 13.4, carbsPer100: 0,    isSystem: true },
  { id: 'sys-shrimp',           name: 'Креветки очищенные (сырые)',  category: 'Рыба и Морепродукты',      unit: 'г',  caloriesPer100: 85,  proteinPer100: 20.1, fatPer100: 0.5,  carbsPer100: 0,    isSystem: true },
  { id: 'sys-tofu',             name: 'Сыр Тофу',                   category: 'Растительные протеины',    unit: 'г',  caloriesPer100: 144, proteinPer100: 15.8, fatPer100: 8.7,  carbsPer100: 2.8,  isSystem: true },
  { id: 'sys-coconut-milk',     name: 'Кокосовое молоко (консервы)', category: 'Бакалея',                  unit: 'мл', caloriesPer100: 197, proteinPer100: 2,    fatPer100: 21.3, carbsPer100: 2.8,  isSystem: true },
  { id: 'sys-sesame-seeds',     name: 'Кунжут (семена)',             category: 'Бакалея',                  unit: 'г',  caloriesPer100: 573, proteinPer100: 17.7, fatPer100: 49.7, carbsPer100: 23.4, isSystem: true },
]
