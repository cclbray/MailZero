/**
 * Railway Adapters
 * Replace Cloudflare Workers bindings with Node.js equivalents for Railway deployment
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import Redis from 'ioredis'
import { Queue, Worker } from 'bullmq'
import * as schema from '../db/schema'
import fs from 'fs/promises'
import path from 'path'

// Database adapter (replaces Hyperdrive)
export function createRailwayDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  
  const client = postgres(process.env.DATABASE_URL, {
    ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  })
  
  return drizzle(client, { schema })
}

// Redis/Queue adapter (replaces Cloudflare Queues)
export function createRailwayQueue() {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL environment variable is required')
  }
  
  const redis = new Redis(process.env.REDIS_URL, {
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  })
  
  const emailQueue = new Queue('email-processing', { 
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  })
  
  return {
    redis,
    emailQueue,
    createWorker: (processor: any) => new Worker('email-processing', processor, { 
      connection: redis,
      concurrency: 5,
    })
  }
}

// File Storage adapter (replaces R2)
export class RailwayStorage {
  private uploadDir: string
  
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
    this.ensureUploadDir()
  }
  
  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true })
    } catch (error) {
      console.warn('Failed to create upload directory:', error)
    }
  }
  
  async put(key: string, data: Buffer | Uint8Array | string): Promise<void> {
    const filePath = path.join(this.uploadDir, key)
    const dir = path.dirname(filePath)
    
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true })
    
    // Write file
    await fs.writeFile(filePath, data)
  }
  
  async get(key: string): Promise<Buffer | null> {
    try {
      const filePath = path.join(this.uploadDir, key)
      return await fs.readFile(filePath)
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null
      }
      throw error
    }
  }
  
  async delete(key: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadDir, key)
      await fs.unlink(filePath)
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw error
      }
    }
  }
  
  async list(prefix?: string): Promise<string[]> {
    try {
      const searchDir = prefix ? path.join(this.uploadDir, prefix) : this.uploadDir
      const files = await fs.readdir(searchDir, { recursive: true })
      return files.filter(file => typeof file === 'string') as string[]
    } catch (error) {
      return []
    }
  }
}

// KV Store adapter (replaces Cloudflare KV)
export class RailwayKV {
  private redis: Redis
  
  constructor(redis: Redis) {
    this.redis = redis
  }
  
  async get(key: string): Promise<string | null> {
    return await this.redis.get(key)
  }
  
  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    if (options?.expirationTtl) {
      await this.redis.setex(key, options.expirationTtl, value)
    } else {
      await this.redis.set(key, value)
    }
  }
  
  async delete(key: string): Promise<void> {
    await this.redis.del(key)
  }
  
  async list(prefix?: string): Promise<string[]> {
    const pattern = prefix ? `${prefix}*` : '*'
    return await this.redis.keys(pattern)
  }
}

// Environment adapter - provides Railway-compatible bindings
export function createRailwayEnv() {
  const db = createRailwayDatabase()
  const queue = createRailwayQueue()
  const storage = new RailwayStorage()
  const kv = new RailwayKV(queue.redis)
  
  return {
    // Database
    DB: db,
    
    // Queue/Redis
    REDIS: queue.redis,
    EMAIL_QUEUE: queue.emailQueue,
    
    // Storage
    THREADS_BUCKET: storage,
    
    // KV Store
    KV: kv,
    
    // Environment variables
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || '3000',
    
    // Add other environment variables as needed
    ...process.env
  }
}
