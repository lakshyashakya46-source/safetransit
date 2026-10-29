import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");
const STORE_PATH = path.resolve(DATA_DIR, "safetransit.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class LocalStore {
  constructor() {
    this.data = {};
    this.loaded = false;
  }

  load() {
    if (this.loaded) return;
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, "utf-8");
        this.data = JSON.parse(raw);
      } else {
        this.data = {};
      }
    } catch (err) {
      console.warn("Failed to read store file, using in-memory store:", err.message);
      this.data = {};
    }
    this.loaded = true;
  }

  save() {
    try {
      fs.writeFileSync(STORE_PATH, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (err) {
      console.warn("Failed to persist store to disk:", err.message);
    }
  }

  getCollection(name) {
    this.load();
    if (!this.data[name]) {
      this.data[name] = [];
    }
    return this.data[name];
  }

  generateId() {
    return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  }

  matches(doc, query) {
    if (!query || Object.keys(query).length === 0) return true;

    for (const [key, val] of Object.entries(query)) {
      if (val && typeof val === "object" && !Array.isArray(val)) {
        if ("$nin" in val) {
          if (val.$nin.includes(doc[key])) return false;
        } else if ("$ne" in val) {
          if (doc[key] === val.$ne) return false;
        } else if ("$in" in val) {
          if (!val.$in.includes(doc[key])) return false;
        }
      } else {
        if (doc[key] !== val) return false;
      }
    }
    return true;
  }

  createModel(collectionName) {
    const store = this;

    class Model {
      static find(query = {}) {
        store.load();
        const coll = store.getCollection(collectionName);
        let results = coll.filter(doc => store.matches(doc, query)).map(doc => ({ ...doc }));

        const queryObj = {
          _results: results,
          sort(sortCriteria = {}) {
            const [field, dir] = Object.entries(sortCriteria)[0] || ["createdAt", -1];
            queryObj._results.sort((a, b) => {
              const valA = a[field] || "";
              const valB = b[field] || "";
              if (valA < valB) return dir === -1 ? 1 : -1;
              if (valA > valB) return dir === -1 ? -1 : 1;
              return 0;
            });
            return queryObj;
          },
          limit(n) {
            queryObj._results = queryObj._results.slice(0, n);
            return queryObj;
          },
          then(resolve, reject) {
            try {
              resolve(queryObj._results);
            } catch (e) {
              reject(e);
            }
          }
        };

        return queryObj;
      }

      static async findOne(query = {}) {
        store.load();
        const coll = store.getCollection(collectionName);
        const match = coll.find(doc => store.matches(doc, query));
        return match ? { ...match } : null;
      }

      static async findById(id) {
        store.load();
        const coll = store.getCollection(collectionName);
        const match = coll.find(doc => doc._id === id || doc.id === id);
        return match ? { ...match } : null;
      }

      static async create(doc) {
        store.load();
        const coll = store.getCollection(collectionName);
        const newDoc = {
          ...doc,
          _id: doc._id || store.generateId(),
          createdAt: doc.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        coll.push(newDoc);
        store.save();
        return { ...newDoc };
      }

      static async insertMany(docs) {
        store.load();
        const coll = store.getCollection(collectionName);
        const inserted = docs.map(doc => ({
          ...doc,
          _id: doc._id || store.generateId(),
          createdAt: doc.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        coll.push(...inserted);
        store.save();
        return inserted.map(d => ({ ...d }));
      }

      static async findByIdAndUpdate(id, update, options = {}) {
        store.load();
        const coll = store.getCollection(collectionName);
        const index = coll.findIndex(doc => doc._id === id || doc.id === id);

        if (index === -1) {
          if (options.upsert) {
            return await Model.create({ ...update, _id: id });
          }
          return null;
        }

        const existing = coll[index];
        const updated = {
          ...existing,
          ...update,
          updatedAt: new Date().toISOString()
        };
        coll[index] = updated;
        store.save();
        return { ...updated };
      }

      static async findOneAndUpdate(query = {}, update, options = {}) {
        store.load();
        const coll = store.getCollection(collectionName);
        const index = coll.findIndex(doc => store.matches(doc, query));

        if (index === -1) {
          if (options.upsert) {
            return await Model.create(update);
          }
          return null;
        }

        const existing = coll[index];
        const updated = {
          ...existing,
          ...update,
          updatedAt: new Date().toISOString()
        };
        coll[index] = updated;
        store.save();
        return { ...updated };
      }

      static async deleteMany(query = {}) {
        store.load();
        const coll = store.getCollection(collectionName);
        if (!query || Object.keys(query).length === 0) {
          store.data[collectionName] = [];
        } else {
          store.data[collectionName] = coll.filter(doc => !store.matches(doc, query));
        }
        store.save();
        return { acknowledged: true };
      }

      static async countDocuments(query = {}) {
        store.load();
        const coll = store.getCollection(collectionName);
        return coll.filter(doc => store.matches(doc, query)).length;
      }
    }

    return Model;
  }
}

export const localStore = new LocalStore();
