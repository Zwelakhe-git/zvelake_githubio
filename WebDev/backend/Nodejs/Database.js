/*
описывает подключение к БД и Редис для кеширования.
используем статические объекты (shared[DB,Redis]Client, чтобы не создалось новый экземпляр и подключение при каждом новом объекте.
*/
import pg from "pg";
import { createClient } from "redis";
import dotenv from "dotenv";
import {dirname, join} from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({path: join(__dirname, "../.env")});

export default class Database {
    static sharedDBClient = null;
    static sharedRedisClient = null;
    static redisConnected = false;

    constructor() {
        if (!Database.sharedDBClient) {
            const { Pool } = pg;
            let dbConfig = {
                max: 20,
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME
            };
            
            Database.sharedDBClient = new Pool(dbConfig);

        }
        
        if (!Database.sharedRedisClient) {
            // Приоритет: REDIS_URL или отдельные настройки
            let redisConfig;
            
            if (process.env.REDIS_URL) {
                redisConfig = { url: process.env.REDIS_URL };
            } else {
                redisConfig = {
                    socket: {
                        host: process.env.REDIS_HOST || '100.108.77.80',
                        port: process.env.REDIS_PORT || 6379
                    }
                };
                // Добавляем пароль если есть
                if (process.env.REDIS_PASSWORD) {
                    redisConfig.password = process.env.REDIS_PASSWORD;
                }
            }
            Database.sharedRedisClient = createClient(redisConfig);
            
            Database.sharedRedisClient.on('error', (err) => { 
                console.log("Redis error details:", {
                    message: err.message,
                    code: err.code,
                    config: redisConfig
                });
            });
            
            Database.sharedRedisClient.on('connect', () => {
                console.log('Redis connected successfully');
                Database.redisConnected = true;
            });
        }
        
        this.dbClient = Database.sharedDBClient;
        this.redisClient = Database.sharedRedisClient;
    }
    
    // Добавьте метод для проверки соединения
    async ensureRedisConnection() {
        if (!Database.sharedRedisClient.isOpen) {
            await Database.sharedRedisClient.connect();
        }
        return Database.sharedRedisClient;
    }
}
