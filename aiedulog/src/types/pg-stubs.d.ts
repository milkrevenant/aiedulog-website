declare module 'pg' {
  export interface QueryResult<T = any> { rows: T[] }
  export class Pool {
    constructor(opts?: any)
    connect(): Promise<{ query: <T=any>(text: string, params?: any[]) => Promise<QueryResult<T>>; release: () => void }>
    on(event: string, cb: (err: any) => void): void
  }
  const _default: any
  export default _default
}


