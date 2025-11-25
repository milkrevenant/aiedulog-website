/**
 * RDS Query Builder - Supabase-like API
 * Provides Supabase-compatible interface for RDS PostgreSQL
 */

import { Pool, QueryResult } from 'pg'

export interface QueryFilter {
  column: string
  operator: string
  value: any
}

export interface QueryOptions {
  select?: string
  from?: string
  filters?: QueryFilter[]
  order?: { column: string; ascending: boolean }[]
  limit?: number
  offset?: number
  single?: boolean
}

/**
 * RDS Response interface - matches Supabase response structure
 */
export interface RDSResponse<T = any> {
  data: T | null
  error: { message: string; code?: string; details?: any; hint?: string } | null
  count: number
  status?: number
  statusText?: string
}

export class RDSQueryBuilder<T = any> implements PromiseLike<RDSResponse<T>> {
  private pool: Pool
  private tableName: string
  private selectFields: string = '*'
  private whereConditions: string[] = []
  private whereValues: any[] = []
  private orderByClause: string = ''
  private limitValue?: number
  private offsetValue?: number
  private singleRow: boolean = false

  constructor(pool: Pool, tableName: string) {
    this.pool = pool
    this.tableName = tableName
  }

  /**
   * Select fields (Supabase-like)
   */
  select(fields?: string, options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): RDSQueryBuilder<T> {
    this.selectFields = fields === '*' || !fields ? '*' : fields
    if (options?.count) {
      this.countMode = true
    }
    return this
  }

  /**
   * WHERE conditions
   */
  eq<K extends keyof T>(column: K | string, value: any): RDSQueryBuilder<T> {
    this.whereConditions.push(`${String(column)} = $${this.whereValues.length + 1}`)
    this.whereValues.push(value)
    return this
  }

  neq<K extends keyof T>(column: K | string, value: any): RDSQueryBuilder<T> {
    this.whereConditions.push(`${String(column)} != $${this.whereValues.length + 1}`)
    this.whereValues.push(value)
    return this
  }

  gt<K extends keyof T>(column: K | string, value: any): RDSQueryBuilder<T> {
    this.whereConditions.push(`${String(column)} > $${this.whereValues.length + 1}`)
    this.whereValues.push(value)
    return this
  }

  gte<K extends keyof T>(column: K | string, value: any): RDSQueryBuilder<T> {
    this.whereConditions.push(`${String(column)} >= $${this.whereValues.length + 1}`)
    this.whereValues.push(value)
    return this
  }

  lt<K extends keyof T>(column: K | string, value: any): RDSQueryBuilder<T> {
    this.whereConditions.push(`${String(column)} < $${this.whereValues.length + 1}`)
    this.whereValues.push(value)
    return this
  }

  lte<K extends keyof T>(column: K | string, value: any): RDSQueryBuilder<T> {
    this.whereConditions.push(`${String(column)} <= $${this.whereValues.length + 1}`)
    this.whereValues.push(value)
    return this
  }

  like<K extends keyof T>(column: K | string, pattern: string): RDSQueryBuilder<T> {
    this.whereConditions.push(`${String(column)} LIKE $${this.whereValues.length + 1}`)
    this.whereValues.push(pattern)
    return this
  }

  ilike<K extends keyof T>(column: K | string, pattern: string): RDSQueryBuilder<T> {
    this.whereConditions.push(`${String(column)} ILIKE $${this.whereValues.length + 1}`)
    this.whereValues.push(pattern)
    return this
  }

  in<K extends keyof T>(column: K | string, values: any[]): RDSQueryBuilder<T> {
    this.whereConditions.push(`${String(column)} = ANY($${this.whereValues.length + 1})`)
    this.whereValues.push(values)
    return this
  }

  is<K extends keyof T>(column: K | string, value: null | boolean): RDSQueryBuilder<T> {
    if (value === null) {
      this.whereConditions.push(`${String(column)} IS NULL`)
    } else {
      this.whereConditions.push(`${String(column)} IS ${value}`)
    }
    return this
  }

  /**
   * NOT IN
   */
  notIn<K extends keyof T>(column: K | string, values: any[]): RDSQueryBuilder<T> {
    this.whereConditions.push(`${String(column)} != ALL($${this.whereValues.length + 1})`)
    this.whereValues.push(values)
    return this
  }

  /**
   * BETWEEN
   */
  between<K extends keyof T>(column: K | string, min: any, max: any): RDSQueryBuilder<T> {
    this.whereConditions.push(`${String(column)} BETWEEN $${this.whereValues.length + 1} AND $${this.whereValues.length + 2}`)
    this.whereValues.push(min, max)
    return this
  }

  /**
   * CONTAINS (for arrays)
   */
  contains<K extends keyof T>(column: K | string, value: any): RDSQueryBuilder<T> {
    this.whereConditions.push(`${String(column)} @> $${this.whereValues.length + 1}`)
    this.whereValues.push(value)
    return this
  }

  /**
   * CONTAINED BY (for arrays)
   */
  containedBy<K extends keyof T>(column: K | string, value: any): RDSQueryBuilder<T> {
    this.whereConditions.push(`${String(column)} <@ $${this.whereValues.length + 1}`)
    this.whereValues.push(value)
    return this
  }

  /**
   * OR condition
   */
  or(filters: string): RDSQueryBuilder<T> {
    this.whereConditions.push(`(${filters})`)
    return this
  }

  /**
   * NOT condition
   */
  not<K extends keyof T>(column: K | string, operator: string, value: any): RDSQueryBuilder<T> {
    this.whereConditions.push(`NOT (${String(column)} ${operator} $${this.whereValues.length + 1})`)
    this.whereValues.push(value)
    return this
  }

  /**
   * TEXT SEARCH
   */
  textSearch<K extends keyof T>(column: K | string, query: string, config?: string): RDSQueryBuilder<T> {
    const tsConfig = config || 'english'
    this.whereConditions.push(`to_tsvector('${tsConfig}', ${String(column)}) @@ plainto_tsquery('${tsConfig}', $${this.whereValues.length + 1})`)
    this.whereValues.push(query)
    return this
  }

  /**
   * MATCH (for FTS)
   */
  match(query: Record<string, any>): RDSQueryBuilder<T> {
    Object.entries(query).forEach(([key, value]) => {
      this.whereConditions.push(`${key} = $${this.whereValues.length + 1}`)
      this.whereValues.push(value)
    })
    return this
  }

  /**
   * ORDER BY
   */
  order<K extends keyof T>(column: K | string, options?: { ascending?: boolean; nullsFirst?: boolean }): RDSQueryBuilder<T> {
    const direction = options?.ascending === false ? 'DESC' : 'ASC'
    const nulls = options?.nullsFirst ? 'NULLS FIRST' : ''
    this.orderByClause = `ORDER BY ${String(column)} ${direction} ${nulls}`.trim()
    return this
  }

  /**
   * LIMIT
   */
  limit(count: number): RDSQueryBuilder<T> {
    this.limitValue = count
    return this
  }

  /**
   * OFFSET
   */
  range(from: number, to: number): RDSQueryBuilder<T> {
    this.offsetValue = from
    this.limitValue = to - from + 1
    return this
  }

  /**
   * Return single row
   */
  single(): RDSQueryBuilder<T> {
    this.singleRow = true
    this.limitValue = 1
    return this
  }

  /**
   * Return single row or null (no error if not found)
   */
  maybeSingle(): RDSQueryBuilder<T> {
    this.singleRow = true
    this.limitValue = 1
    return this
  }

  /**
   * Count rows (returns count instead of data)
   */
  private countMode: boolean = false
  count(options?: { count: 'exact' | 'planned' | 'estimated' }): RDSQueryBuilder<T> {
    this.countMode = true
    return this
  }

  /**
   * Type assertion helper for return type
   */
  returns<U>(): RDSQueryBuilder<U> {
    // Type-only helper - no runtime effect
    return this as any
  }

  /**
   * Execute SELECT query
   */
  async execute(): Promise<RDSResponse<T>> {
    const client = await this.pool.connect()
    try {
      const query = this.countMode ? this.buildCountQuery() : this.buildSelectQuery()
      const result: QueryResult = await client.query(query, this.whereValues)

      if (this.countMode) {
        return {
          data: result.rows as any,
          error: null,
          count: parseInt(result.rows[0]?.count || '0', 10)
        }
      }

      if (this.singleRow) {
        return {
          data: (result.rows[0] || null) as any,
          error: null,
          count: result.rows.length
        }
      }

      return {
        data: result.rows as any,
        error: null,
        count: result.rows.length
      }
    } catch (error: any) {
      console.error(`[RDS Query Error] ${this.tableName}:`, error.message)
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
          details: error.detail
        },
        count: 0
      }
    } finally {
      client.release()
    }
  }

  /**
   * Promise compatibility to allow `await query` syntax
   */
  then<TResult1 = RDSResponse<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: RDSResponse<T>) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }

  catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | undefined
      | null
  ): Promise<RDSResponse<T> | TResult> {
    return this.execute().catch(onrejected)
  }

  finally(onfinally?: (() => void) | undefined | null): Promise<RDSResponse<T>> {
    return this.execute().finally(onfinally)
  }

  /**
   * INSERT
   */
  async insert(data: Partial<T> | Partial<T>[], options?: { onConflict?: string; select?: string }): Promise<RDSResponse<T | T[]>> {
    const client = await this.pool.connect()
    try {
      const records = Array.isArray(data) ? data : [data]

      if (records.length === 0) {
        return { data: [], error: null, count: 0 }
      }

      const columns = Object.keys(records[0])
      const values: any[] = []
      const valuePlaceholders: string[] = []

      records.forEach((record, rowIndex) => {
        const rowPlaceholders: string[] = []
        columns.forEach((col, colIndex) => {
          values.push((record as any)[col])
          rowPlaceholders.push(`$${rowIndex * columns.length + colIndex + 1}`)
        })
        valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`)
      })

      let query = `
        INSERT INTO ${this.tableName} (${columns.join(', ')})
        VALUES ${valuePlaceholders.join(', ')}
      `

      if (options?.onConflict) {
        query += ` ON CONFLICT ${options.onConflict}`
      }

      query += ` RETURNING ${options?.select || '*'}`

      const result: QueryResult = await client.query(query, values)

      return {
        data: (this.singleRow ? result.rows[0] : result.rows) as any,
        error: null,
        count: result.rows.length
      }
    } catch (error: any) {
      console.error(`[RDS Insert Error] ${this.tableName}:`, error.message)
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
          details: error.detail
        },
        count: 0
      }
    } finally {
      client.release()
    }
  }

  /**
   * UPDATE
   */
  async update(data: Partial<T>, options?: { select?: string }): Promise<RDSResponse<T | T[]>> {
    const client = await this.pool.connect()
    try {
      const columns = Object.keys(data)
      const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ')
      const values = columns.map(col => (data as any)[col])

      const whereClause = this.whereConditions.length > 0
        ? `WHERE ${this.whereConditions.join(' AND ')}`
        : ''

      values.push(...this.whereValues)

      const query = `
        UPDATE ${this.tableName}
        SET ${setClause}, updated_at = NOW()
        ${whereClause}
        RETURNING ${options?.select || '*'}
      `

      const result: QueryResult = await client.query(query, values)

      return {
        data: (this.singleRow ? result.rows[0] : result.rows) as any,
        error: null,
        count: result.rows.length
      }
    } catch (error: any) {
      console.error(`[RDS Update Error] ${this.tableName}:`, error.message)
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
          details: error.detail
        },
        count: 0
      }
    } finally {
      client.release()
    }
  }

  /**
   * UPSERT (INSERT ... ON CONFLICT DO UPDATE)
   */
  async upsert(data: Partial<T> | Partial<T>[], options?: { onConflict?: string; select?: string }): Promise<RDSResponse<T | T[]>> {
    const client = await this.pool.connect()
    try {
      const records = Array.isArray(data) ? data : [data]

      if (records.length === 0) {
        return { data: [], error: null, count: 0 }
      }

      const columns = Object.keys(records[0])
      const values: any[] = []
      const valuePlaceholders: string[] = []

      records.forEach((record, rowIndex) => {
        const rowPlaceholders: string[] = []
        columns.forEach((col, colIndex) => {
          values.push((record as any)[col])
          rowPlaceholders.push(`$${rowIndex * columns.length + colIndex + 1}`)
        })
        valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`)
      })

      const updateColumns = columns.filter(col => col !== 'id' && col !== 'created_at')
      const updateClause = updateColumns.map(col => `${col} = EXCLUDED.${col}`).join(', ')

      let query = `
        INSERT INTO ${this.tableName} (${columns.join(', ')})
        VALUES ${valuePlaceholders.join(', ')}
        ON CONFLICT ${options?.onConflict || '(id)'}
        DO UPDATE SET ${updateClause}, updated_at = NOW()
        RETURNING ${options?.select || '*'}
      `

      const result: QueryResult = await client.query(query, values)

      return {
        data: (this.singleRow ? result.rows[0] : result.rows) as any,
        error: null,
        count: result.rows.length
      }
    } catch (error: any) {
      console.error(`[RDS Upsert Error] ${this.tableName}:`, error.message)
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
          details: error.detail
        },
        count: 0
      }
    } finally {
      client.release()
    }
  }

  /**
   * DELETE
   */
  async delete(options?: { select?: string }): Promise<RDSResponse<T[]>> {
    const client = await this.pool.connect()
    try {
      const whereClause = this.whereConditions.length > 0
        ? `WHERE ${this.whereConditions.join(' AND ')}`
        : ''

      const query = `
        DELETE FROM ${this.tableName}
        ${whereClause}
        RETURNING ${options?.select || '*'}
      `

      const result: QueryResult = await client.query(query, this.whereValues)

      return {
        data: result.rows as any,
        error: null,
        count: result.rows.length
      }
    } catch (error: any) {
      console.error(`[RDS Delete Error] ${this.tableName}:`, error.message)
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
          details: error.detail
        },
        count: 0
      }
    } finally {
      client.release()
    }
  }

  /**
   * Build SELECT query
   */
  private buildSelectQuery(): string {
    const whereClause = this.whereConditions.length > 0
      ? `WHERE ${this.whereConditions.join(' AND ')}`
      : ''

    const limitClause = this.limitValue ? `LIMIT ${this.limitValue}` : ''
    const offsetClause = this.offsetValue ? `OFFSET ${this.offsetValue}` : ''

    return `
      SELECT ${this.selectFields}
      FROM ${this.tableName}
      ${whereClause}
      ${this.orderByClause}
      ${limitClause}
      ${offsetClause}
    `.trim().replace(/\s+/g, ' ')
  }

  /**
   * Build COUNT query
   */
  private buildCountQuery(): string {
    const whereClause = this.whereConditions.length > 0
      ? `WHERE ${this.whereConditions.join(' AND ')}`
      : ''

    return `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      ${whereClause}
    `.trim().replace(/\s+/g, ' ')
  }
}

/**
 * RDS Client - Supabase-like interface
 */
export class RDSClient {
  private pool: Pool

  constructor(pool: Pool) {
    this.pool = pool
  }

  /**
   * Start a query on a table
   */
  from<T = any>(tableName: string): RDSQueryBuilder<T> {
    return new RDSQueryBuilder<T>(this.pool, tableName)
  }

  /**
   * Execute raw SQL
   */
  async query<T = any>(sql: string, params?: any[]): Promise<RDSResponse<T[]>> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(sql, params)
      return {
        data: result.rows,
        error: null,
        count: result.rows.length
      }
    } catch (error: any) {
      console.error('[RDS Raw Query Error]:', error.message)
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
          details: error.detail
        },
        count: 0
      }
    } finally {
      client.release()
    }
  }

  /**
   * RPC call (stored procedure)
   */
  async rpc<T = any>(fnName: string, params?: any): Promise<RDSResponse<T[]>> {
    const client = await this.pool.connect()
    try {
      const paramNames = params ? Object.keys(params) : []
      const paramValues = params ? Object.values(params) : []
      const paramPlaceholders = paramNames.map((_, i) => `$${i + 1}`).join(', ')

      const query = `SELECT * FROM ${fnName}(${paramPlaceholders})`
      const result = await client.query(query, paramValues)

      return {
        data: result.rows,
        error: null,
        count: result.rows.length
      }
    } catch (error: any) {
      console.error(`[RDS RPC Error] ${fnName}:`, error.message)
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
          details: error.detail
        },
        count: 0
      }
    } finally {
      client.release()
    }
  }
}
