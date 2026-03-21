import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = path.join(process.cwd(), 'data', 'nutritrack.db');

  // Ensure data directory exists
  const fs = require('fs');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initTables(db);
  return db;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'User',
      age INTEGER,
      weight_kg REAL,
      height_cm REAL,
      activity_level TEXT NOT NULL DEFAULT 'moderate',
      goal TEXT NOT NULL DEFAULT 'maintain',
      target_calories REAL NOT NULL DEFAULT 2000,
      target_protein_g REAL NOT NULL DEFAULT 150,
      target_carbs_g REAL NOT NULL DEFAULT 250,
      target_fat_g REAL NOT NULL DEFAULT 65,
      target_fiber_g REAL NOT NULL DEFAULT 30,
      target_sodium_mg REAL NOT NULL DEFAULT 2300,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS food_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT,
      category TEXT,
      serving_size REAL NOT NULL DEFAULT 100,
      serving_unit TEXT NOT NULL DEFAULT 'g',
      calories REAL NOT NULL DEFAULT 0,
      protein_g REAL NOT NULL DEFAULT 0,
      carbs_g REAL NOT NULL DEFAULT 0,
      fat_g REAL NOT NULL DEFAULT 0,
      fiber_g REAL NOT NULL DEFAULT 0,
      sugar_g REAL NOT NULL DEFAULT 0,
      sodium_mg REAL NOT NULL DEFAULT 0,
      cholesterol_mg REAL NOT NULL DEFAULT 0,
      saturated_fat_g REAL NOT NULL DEFAULT 0,
      fdc_id TEXT,
      is_custom INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS food_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      food_item_id INTEGER NOT NULL,
      meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast','lunch','dinner','snack')),
      servings REAL NOT NULL DEFAULT 1,
      logged_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (food_item_id) REFERENCES food_items(id)
    );

    CREATE TABLE IF NOT EXISTS weight_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      weight_kg REAL NOT NULL,
      logged_date TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS favorite_foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      food_item_id INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (food_item_id) REFERENCES food_items(id),
      UNIQUE(user_id, food_item_id)
    );

    CREATE INDEX IF NOT EXISTS idx_food_log_date ON food_log(user_id, logged_date);
    CREATE INDEX IF NOT EXISTS idx_food_log_meal ON food_log(user_id, logged_date, meal_type);
    CREATE INDEX IF NOT EXISTS idx_weight_log_date ON weight_log(user_id, logged_date);
    CREATE INDEX IF NOT EXISTS idx_food_items_name ON food_items(name);
  `);

  // Seed default user if none exist
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (userCount.c === 0) {
    db.prepare(`
      INSERT INTO users (email, password_hash, name, age, weight_kg, height_cm, activity_level, goal)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('demo@nutritrack.app', '$2a$10$placeholder', 'Demo User', 25, 75, 175, 'moderate', 'maintain');
  }

  // Seed common foods if table is empty
  const foodCount = db.prepare('SELECT COUNT(*) as c FROM food_items').get() as { c: number };
  if (foodCount.c === 0) {
    seedCommonFoods(db);
  }
}

function seedCommonFoods(db: Database.Database) {
  const stmt = db.prepare(`
    INSERT INTO food_items (name, brand, category, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, cholesterol_mg, saturated_fat_g, is_custom)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);

  const foods = [
    // Proteins
    ['Chicken Breast (grilled)', null, 'Protein', 100, 'g', 165, 31, 0, 3.6, 0, 0, 74, 85, 1, 0],
    ['Salmon Fillet', null, 'Protein', 100, 'g', 208, 20, 0, 13, 0, 0, 59, 55, 3.1, 0],
    ['Eggs (large, whole)', null, 'Protein', 50, 'g', 72, 6.3, 0.4, 4.8, 0, 0.2, 71, 186, 1.6, 0],
    ['Egg Whites', null, 'Protein', 33, 'g', 17, 3.6, 0.2, 0.1, 0, 0.2, 55, 0, 0, 0],
    ['Ground Turkey (93% lean)', null, 'Protein', 100, 'g', 170, 21, 0, 9.4, 0, 0, 81, 84, 2.6, 0],
    ['Tofu (firm)', null, 'Protein', 100, 'g', 144, 17, 3, 9, 2.3, 0.7, 14, 0, 1.3, 0],
    ['Greek Yogurt (plain, nonfat)', null, 'Dairy', 170, 'g', 100, 17, 6, 0.7, 0, 4, 56, 10, 0.3, 0],
    ['Cottage Cheese (2%)', null, 'Dairy', 113, 'g', 92, 12, 5, 2.6, 0, 4.1, 348, 14, 1.5, 0],
    ['Tuna (canned, in water)', null, 'Protein', 85, 'g', 73, 17, 0, 0.8, 0, 0, 210, 30, 0.2, 0],
    ['Shrimp', null, 'Protein', 100, 'g', 85, 20, 0.2, 0.5, 0, 0, 566, 189, 0.1, 0],
    // Grains & Carbs
    ['Brown Rice (cooked)', null, 'Grain', 195, 'g', 216, 5, 45, 1.8, 3.5, 0.7, 10, 0, 0.4, 0],
    ['White Rice (cooked)', null, 'Grain', 158, 'g', 206, 4.3, 45, 0.4, 0.6, 0.1, 1.6, 0, 0.1, 0],
    ['Oatmeal (cooked)', null, 'Grain', 234, 'g', 154, 5.4, 27, 2.6, 4, 0.6, 115, 0, 0.4, 0],
    ['Whole Wheat Bread', null, 'Grain', 33, 'g', 82, 4, 14, 1.1, 1.9, 1.5, 146, 0, 0.2, 0],
    ['Sweet Potato (baked)', null, 'Vegetable', 114, 'g', 103, 2.3, 24, 0.1, 3.8, 7.4, 41, 0, 0, 0],
    ['Quinoa (cooked)', null, 'Grain', 185, 'g', 222, 8.1, 39, 3.6, 5.2, 1.6, 13, 0, 0.4, 0],
    ['Pasta (cooked)', null, 'Grain', 140, 'g', 220, 8.1, 43, 1.3, 2.5, 0.8, 1, 0, 0.2, 0],
    // Fruits
    ['Banana', null, 'Fruit', 118, 'g', 105, 1.3, 27, 0.4, 3.1, 14, 1.2, 0, 0.1, 0],
    ['Apple', null, 'Fruit', 182, 'g', 95, 0.5, 25, 0.3, 4.4, 19, 1.8, 0, 0.1, 0],
    ['Blueberries', null, 'Fruit', 148, 'g', 84, 1.1, 21, 0.5, 3.6, 15, 1.5, 0, 0, 0],
    ['Strawberries', null, 'Fruit', 152, 'g', 49, 1, 12, 0.5, 3, 7.4, 1.5, 0, 0, 0],
    ['Orange', null, 'Fruit', 131, 'g', 62, 1.2, 15, 0.2, 3.1, 12, 0, 0, 0, 0],
    // Vegetables
    ['Broccoli (cooked)', null, 'Vegetable', 91, 'g', 31, 2.6, 6, 0.4, 2.4, 1.5, 30, 0, 0.1, 0],
    ['Spinach (raw)', null, 'Vegetable', 30, 'g', 7, 0.9, 1.1, 0.1, 0.7, 0.1, 24, 0, 0, 0],
    ['Avocado', null, 'Fruit', 150, 'g', 240, 3, 13, 22, 10, 1, 10.5, 0, 3.2, 0],
    ['Mixed Salad Greens', null, 'Vegetable', 85, 'g', 15, 1.3, 2.5, 0.2, 1.5, 0.5, 25, 0, 0, 0],
    ['Bell Pepper (red)', null, 'Vegetable', 119, 'g', 37, 1.2, 7.2, 0.4, 2.5, 5, 4, 0, 0.1, 0],
    ['Carrots', null, 'Vegetable', 61, 'g', 25, 0.6, 6, 0.1, 1.7, 2.9, 42, 0, 0, 0],
    // Nuts & Seeds
    ['Almonds', null, 'Nuts', 28, 'g', 164, 6, 6, 14, 3.5, 1.2, 0.3, 0, 1.1, 0],
    ['Peanut Butter', null, 'Nuts', 32, 'g', 190, 7, 7, 16, 1.5, 3, 136, 0, 3, 0],
    ['Walnuts', null, 'Nuts', 28, 'g', 185, 4.3, 3.9, 18, 1.9, 0.7, 0.6, 0, 1.7, 0],
    ['Chia Seeds', null, 'Nuts', 28, 'g', 138, 4.7, 12, 8.7, 9.8, 0, 5, 0, 0.9, 0],
    // Dairy
    ['Whole Milk', null, 'Dairy', 244, 'ml', 149, 8, 12, 8, 0, 12, 105, 24, 4.6, 0],
    ['Cheddar Cheese', null, 'Dairy', 28, 'g', 113, 7, 0.4, 9.3, 0, 0.1, 174, 28, 5.3, 0],
    ['Mozzarella (part-skim)', null, 'Dairy', 28, 'g', 72, 7, 0.8, 4.5, 0, 0.3, 175, 18, 2.9, 0],
    // Fats & Oils
    ['Olive Oil', null, 'Oil', 14, 'ml', 119, 0, 0, 14, 0, 0, 0.3, 0, 1.9, 0],
    ['Butter', null, 'Dairy', 14, 'g', 102, 0.1, 0, 11.5, 0, 0, 2, 31, 7.3, 0],
    // Common meals / snacks
    ['Protein Bar (avg)', null, 'Snack', 60, 'g', 210, 20, 22, 7, 3, 6, 200, 5, 2.5, 0],
    ['Whey Protein Powder', null, 'Supplement', 31, 'g', 120, 24, 3, 1.5, 0, 1, 130, 35, 0.5, 0],
    ['Rice Cake', null, 'Snack', 9, 'g', 35, 0.7, 7.3, 0.3, 0.4, 0, 29, 0, 0.1, 0],
    ['Granola', null, 'Grain', 55, 'g', 240, 5, 38, 9, 3, 12, 85, 0, 1.5, 0],
    ['Hummus', null, 'Snack', 30, 'g', 52, 2.4, 4.6, 3, 1.5, 0.1, 96, 0, 0.4, 0],
    ['Dark Chocolate (70%)', null, 'Snack', 28, 'g', 170, 2.2, 13, 12, 3.1, 7, 6, 2.3, 6.8, 0],
    // Beverages
    ['Black Coffee', null, 'Beverage', 237, 'ml', 2, 0.3, 0, 0, 0, 0, 4.7, 0, 0, 0],
    ['Orange Juice', null, 'Beverage', 248, 'ml', 112, 1.7, 26, 0.5, 0.5, 21, 2.5, 0, 0.1, 0],
    // Common fast/prepared foods
    ['Pizza Slice (cheese)', null, 'Prepared', 107, 'g', 272, 12, 34, 10, 2.3, 3.6, 551, 22, 4.5, 0],
    ['Hamburger (single patty)', null, 'Prepared', 110, 'g', 295, 17, 24, 14, 1.3, 5, 562, 52, 5.4, 0],
    ['French Fries (medium)', null, 'Prepared', 117, 'g', 365, 4, 44, 19, 4, 0.3, 246, 0, 2.5, 0],
    ['Chicken Caesar Salad', null, 'Prepared', 300, 'g', 360, 30, 12, 22, 3, 2, 890, 75, 5, 0],
    ['Turkey Sandwich (whole wheat)', null, 'Prepared', 200, 'g', 320, 22, 34, 10, 4, 4, 780, 40, 2.5, 0],
  ];

  const insertMany = db.transaction((items: (string | number | null)[][]) => {
    for (const food of items) {
      stmt.run(...food);
    }
  });

  insertMany(foods);
}
