import { Pool, types } from "pg";

// Parse bigint (OID 20) and numeric (OID 1700) as JS numbers instead of strings
types.setTypeParser(20, (val: string) => parseInt(val, 10));
types.setTypeParser(1700, (val: string) => parseFloat(val));

let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.SUPABASE_BRANCH_DB_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      query_timeout: 30000,
      statement_timeout: 30000,
    });
  }
  return _pool;
}

type QueryResult = { data: any; error: any; count?: number };

class QueryBuilder {
  private _schema: string;
  private _table: string = "";
  private _selectCols: string = "*";
  private _filters: { sql: string; params: any[] }[] = [];
  private _orderClauses: string[] = [];
  private _limitVal: number | null = null;
  private _offsetVal: number | null = null;
  private _rangeFrom: number | null = null;
  private _rangeTo: number | null = null;
  private _mode: "select" | "insert" | "update" | "delete" | "upsert" | "rpc" =
    "select";
  private _insertData: any = null;
  private _updateData: any = null;
  private _upsertData: any = null;
  private _upsertConflict: string = "";
  private _returnSingle: boolean = false;
  private _returnMaybeSingle: boolean = false;
  private _wantCount: boolean = false;
  private _headOnly: boolean = false;
  private _rpcName: string = "";
  private _rpcParams: any = {};
  private _pool: Pool;
  private _returnRepresentation: boolean = false;

  constructor(pool: Pool, schema: string = "menuca_v3") {
    this._pool = pool;
    this._schema = schema;
  }

  schema(name: string): QueryBuilder {
    this._schema = name;
    return this;
  }

  from(table: string): QueryBuilder {
    this._table = table;
    return this;
  }

  select(
    cols?: string,
    opts?: { count?: string; head?: boolean },
  ): QueryBuilder {
    this._mode = "select";
    this._selectCols = cols || "*";
    if (opts?.count === "exact") this._wantCount = true;
    if (opts?.head) this._headOnly = true;
    return this;
  }

  insert(data: any | any[]): QueryBuilder {
    this._mode = "insert";
    this._insertData = Array.isArray(data) ? data : [data];
    this._returnRepresentation = true;
    return this;
  }

  update(data: any): QueryBuilder {
    this._mode = "update";
    this._updateData = data;
    this._returnRepresentation = true;
    return this;
  }

  delete(): QueryBuilder {
    this._mode = "delete";
    return this;
  }

  upsert(data: any | any[], opts?: { onConflict?: string }): QueryBuilder {
    this._mode = "upsert";
    this._upsertData = Array.isArray(data) ? data : [data];
    this._upsertConflict = opts?.onConflict || "";
    this._returnRepresentation = true;
    return this;
  }

  rpc(name: string, params?: any): RpcBuilder {
    this._mode = "rpc";
    this._rpcName = name;
    this._rpcParams = params || {};
    return this as unknown as RpcBuilder;
  }

  // Filters
  eq(col: string, val: any): QueryBuilder {
    this._filters.push({ sql: `${this._quoteCol(col)} = $P`, params: [val] });
    return this;
  }

  neq(col: string, val: any): QueryBuilder {
    this._filters.push({ sql: `${this._quoteCol(col)} != $P`, params: [val] });
    return this;
  }

  gt(col: string, val: any): QueryBuilder {
    this._filters.push({ sql: `${this._quoteCol(col)} > $P`, params: [val] });
    return this;
  }

  gte(col: string, val: any): QueryBuilder {
    this._filters.push({ sql: `${this._quoteCol(col)} >= $P`, params: [val] });
    return this;
  }

  lt(col: string, val: any): QueryBuilder {
    this._filters.push({ sql: `${this._quoteCol(col)} < $P`, params: [val] });
    return this;
  }

  lte(col: string, val: any): QueryBuilder {
    this._filters.push({ sql: `${this._quoteCol(col)} <= $P`, params: [val] });
    return this;
  }

  in(col: string, vals: any[]): QueryBuilder {
    if (vals.length === 0) {
      this._filters.push({ sql: "FALSE", params: [] });
    } else {
      const placeholders = vals.map(() => "$P").join(", ");
      this._filters.push({
        sql: `${this._quoteCol(col)} IN (${placeholders})`,
        params: vals,
      });
    }
    return this;
  }

  is(col: string, val: any): QueryBuilder {
    if (val === null) {
      this._filters.push({ sql: `${this._quoteCol(col)} IS NULL`, params: [] });
    } else if (val === true) {
      this._filters.push({ sql: `${this._quoteCol(col)} IS TRUE`, params: [] });
    } else if (val === false) {
      this._filters.push({
        sql: `${this._quoteCol(col)} IS FALSE`,
        params: [],
      });
    }
    return this;
  }

  not(col: string, operator: string, val: any): QueryBuilder {
    if (operator === "is" && val === null) {
      this._filters.push({
        sql: `${this._quoteCol(col)} IS NOT NULL`,
        params: [],
      });
    } else if (operator === "in") {
      const vals = Array.isArray(val) ? val : [val];
      if (vals.length === 0) return this;
      const placeholders = vals.map(() => "$P").join(", ");
      this._filters.push({
        sql: `${this._quoteCol(col)} NOT IN (${placeholders})`,
        params: vals,
      });
    } else if (operator === "eq") {
      this._filters.push({
        sql: `${this._quoteCol(col)} != $P`,
        params: [val],
      });
    }
    return this;
  }

  ilike(col: string, pattern: string): QueryBuilder {
    this._filters.push({
      sql: `${this._quoteCol(col)} ILIKE $P`,
      params: [pattern],
    });
    return this;
  }

  like(col: string, pattern: string): QueryBuilder {
    this._filters.push({
      sql: `${this._quoteCol(col)} LIKE $P`,
      params: [pattern],
    });
    return this;
  }

  or(filterStr: string): QueryBuilder {
    // Parse Supabase or() syntax: "col1.eq.val1,col2.ilike.%val2%"
    const conditions = this._parseOrFilter(filterStr);
    if (conditions.length > 0) {
      const parts: string[] = [];
      const params: any[] = [];
      for (const cond of conditions) {
        parts.push(cond.sql);
        params.push(...cond.params);
      }
      this._filters.push({ sql: `(${parts.join(" OR ")})`, params });
    }
    return this;
  }

  contains(col: string, val: any): QueryBuilder {
    this._filters.push({
      sql: `${this._quoteCol(col)} @> $P`,
      params: [JSON.stringify(val)],
    });
    return this;
  }

  // Ordering & pagination
  order(col: string, opts?: { ascending?: boolean }): QueryBuilder {
    const dir = opts?.ascending === false ? "DESC" : "ASC";
    this._orderClauses.push(`${this._quoteCol(col)} ${dir}`);
    return this;
  }

  limit(n: number): QueryBuilder {
    this._limitVal = n;
    return this;
  }

  range(from: number, to: number): QueryBuilder {
    this._rangeFrom = from;
    this._rangeTo = to;
    return this;
  }

  // Result modifiers
  single(): this {
    this._returnSingle = true;
    return this;
  }

  maybeSingle(): this {
    this._returnMaybeSingle = true;
    return this;
  }

  // Execute via then() so it works with await
  then(
    resolve: (result: QueryResult) => void,
    reject?: (err: any) => void,
  ): void {
    this._execute()
      .then(resolve)
      .catch(reject || (() => {}));
  }

  private _quoteCol(col: string): string {
    // Handle dotted columns like "table.column"
    return col
      .split(".")
      .map((part) => `"${part}"`)
      .join(".");
  }

  private _qualifiedTable(): string {
    return `"${this._schema}"."${this._table}"`;
  }

  private _parseOrFilter(filterStr: string): { sql: string; params: any[] }[] {
    const results: { sql: string; params: any[] }[] = [];
    // Split on commas that are not inside parentheses
    const parts = filterStr.split(",");
    for (const part of parts) {
      const trimmed = part.trim();
      // Parse "col.operator.value" format
      const dotIdx = trimmed.indexOf(".");
      if (dotIdx === -1) continue;
      const col = trimmed.substring(0, dotIdx);
      const rest = trimmed.substring(dotIdx + 1);
      const opIdx = rest.indexOf(".");
      if (opIdx === -1) continue;
      const op = rest.substring(0, opIdx);
      const val = rest.substring(opIdx + 1);

      switch (op) {
        case "eq":
          results.push({ sql: `${this._quoteCol(col)} = $P`, params: [val] });
          break;
        case "neq":
          results.push({ sql: `${this._quoteCol(col)} != $P`, params: [val] });
          break;
        case "ilike":
          results.push({
            sql: `${this._quoteCol(col)} ILIKE $P`,
            params: [val],
          });
          break;
        case "like":
          results.push({
            sql: `${this._quoteCol(col)} LIKE $P`,
            params: [val],
          });
          break;
        case "gt":
          results.push({ sql: `${this._quoteCol(col)} > $P`, params: [val] });
          break;
        case "gte":
          results.push({ sql: `${this._quoteCol(col)} >= $P`, params: [val] });
          break;
        case "lt":
          results.push({ sql: `${this._quoteCol(col)} < $P`, params: [val] });
          break;
        case "lte":
          results.push({ sql: `${this._quoteCol(col)} <= $P`, params: [val] });
          break;
        case "is":
          if (val === "null") {
            results.push({ sql: `${this._quoteCol(col)} IS NULL`, params: [] });
          }
          break;
        default:
          results.push({ sql: `${this._quoteCol(col)} = $P`, params: [val] });
      }
    }
    return results;
  }

  private _buildWhereClause(startIdx: number): { sql: string; params: any[] } {
    if (this._filters.length === 0) return { sql: "", params: [] };

    const parts: string[] = [];
    const params: any[] = [];
    let idx = startIdx;

    for (const filter of this._filters) {
      let sql = filter.sql;
      for (const param of filter.params) {
        sql = sql.replace("$P", `$${idx++}`);
        params.push(param);
      }
      parts.push(sql);
    }

    return { sql: `WHERE ${parts.join(" AND ")}`, params };
  }

  private _parseSelect(selectStr: string): {
    columns: string[];
    relations: Map<string, { fk: string; cols: string }>;
  } {
    const columns: string[] = [];
    const relations = new Map<string, { fk: string; cols: string }>();

    let depth = 0;
    let current = "";
    for (let i = 0; i < selectStr.length; i++) {
      const ch = selectStr[i];
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if (ch === "," && depth === 0) {
        this._processSelectPart(current.trim(), columns, relations);
        current = "";
        continue;
      }
      current += ch;
    }
    if (current.trim()) {
      this._processSelectPart(current.trim(), columns, relations);
    }

    return { columns, relations };
  }

  private _processSelectPart(
    part: string,
    columns: string[],
    relations: Map<string, { fk: string; cols: string }>,
  ) {
    const relMatch = part.match(/^(\w+)(?:!(\w+))?\s*\(([\s\S]+)\)$/);
    if (relMatch) {
      const [, relName, fkHint, relCols] = relMatch;
      relations.set(relName, { fk: fkHint || "", cols: relCols });
    } else {
      columns.push(part.trim());
    }
  }

  private async _execute(): Promise<QueryResult> {
    try {
      if (this._mode === "rpc") {
        return await this._executeRpc();
      }
      if (this._mode === "select") {
        return await this._executeSelect();
      }
      if (this._mode === "insert") {
        return await this._executeInsert();
      }
      if (this._mode === "update") {
        return await this._executeUpdate();
      }
      if (this._mode === "delete") {
        return await this._executeDelete();
      }
      if (this._mode === "upsert") {
        return await this._executeUpsert();
      }
      return { data: null, error: { message: "Unknown mode" } };
    } catch (err: any) {
      console.error("[LocalClient] Query error:", err.message);
      return { data: null, error: { message: err.message, code: err.code } };
    }
  }

  private async _executeSelect(): Promise<QueryResult> {
    const { columns, relations } = this._parseSelect(this._selectCols);

    // Build base columns - use * or specific columns
    const colStr = columns.includes("*")
      ? `t.*`
      : columns.map((c) => `t."${c}"`).join(", ");

    const where = this._buildWhereClause(1);
    const orderBy =
      this._orderClauses.length > 0
        ? `ORDER BY ${this._orderClauses.join(", ")}`
        : "";

    let limitOffset = "";
    if (this._rangeFrom !== null && this._rangeTo !== null) {
      limitOffset = `LIMIT ${this._rangeTo - this._rangeFrom + 1} OFFSET ${this._rangeFrom}`;
    } else {
      if (this._limitVal !== null) limitOffset += `LIMIT ${this._limitVal}`;
      if (this._offsetVal !== null) limitOffset += ` OFFSET ${this._offsetVal}`;
    }

    // Count-only query
    if (this._headOnly && this._wantCount) {
      const countSql = `SELECT COUNT(*) as count FROM ${this._qualifiedTable()} t ${where.sql}`;
      const res = await this._pool.query(countSql, where.params);
      return { data: null, count: parseInt(res.rows[0].count), error: null };
    }

    const sql = `SELECT ${colStr} FROM ${this._qualifiedTable()} t ${where.sql} ${orderBy} ${limitOffset}`;
    const res = await this._pool.query(sql, where.params);

    let data = res.rows;

    // Handle relations (simplified: fetch related data in separate queries)
    if (relations.size > 0) {
      data = await this._resolveRelations(data, relations);
    }

    // Count
    let count: number | undefined;
    if (this._wantCount) {
      const countSql = `SELECT COUNT(*) as count FROM ${this._qualifiedTable()} t ${where.sql}`;
      const countRes = await this._pool.query(countSql, where.params);
      count = parseInt(countRes.rows[0].count);
    }

    if (this._returnSingle) {
      if (data.length === 0) {
        return {
          data: null,
          error: { message: "Row not found", code: "PGRST116" },
          count,
        };
      }
      if (data.length > 1) {
        return {
          data: null,
          error: {
            message: "Multiple rows returned for single",
            code: "PGRST116",
          },
          count,
        };
      }
      return { data: data[0], error: null, count };
    }

    if (this._returnMaybeSingle) {
      return { data: data.length > 0 ? data[0] : null, error: null, count };
    }

    return { data, error: null, count };
  }

  private async _resolveRelations(
    rows: any[],
    relations: Map<string, { fk: string; cols: string }>,
  ): Promise<any[]> {
    if (rows.length === 0) return rows;

    for (const [relName, { fk, cols }] of relations) {
      // Determine FK: try "relName_id" on parent, or "table_id" on child
      const parentFk = `${relName.replace(/s$/, "")}_id`;
      const childFk = fk || `${this._table.replace(/s$/, "")}_id`;

      // Check if parent has a FK column pointing to the relation
      const firstRow = rows[0];
      const hasParentFk = parentFk in firstRow || `${relName}_id` in firstRow;

      if (hasParentFk) {
        // Parent has FK to child (e.g., orders.restaurant_id -> restaurants)
        const fkCol = parentFk in firstRow ? parentFk : `${relName}_id`;
        const ids = [...new Set(rows.map((r) => r[fkCol]).filter(Boolean))];
        if (ids.length > 0) {
          const relTable = relName;
          const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
          const relCols =
            cols === "*"
              ? "*"
              : cols
                  .split(",")
                  .map((c) => `"${c.trim()}"`)
                  .join(", ");
          const relSql = `SELECT ${relCols}, "id" FROM "${this._schema}"."${relTable}" WHERE "id" IN (${placeholders})`;
          const relRes = await this._pool.query(relSql, ids);
          const relMap = new Map(relRes.rows.map((r: any) => [r.id, r]));
          for (const row of rows) {
            row[relName] = relMap.get(row[fkCol]) || null;
          }
        }
      } else {
        // Child has FK to parent (e.g., restaurant_locations.restaurant_id -> restaurants)
        const ids = [...new Set(rows.map((r) => r.id).filter(Boolean))];
        if (ids.length > 0) {
          const actualFk = fk || childFk;
          const relTable = relName.includes("!")
            ? relName.split("!")[0]
            : relName;
          const relCols =
            cols === "*"
              ? "*"
              : cols
                  .split(",")
                  .map((c) => {
                    // Handle nested relations in the column list
                    if (c.includes("(")) return c.trim();
                    return `"${c.trim()}"`;
                  })
                  .join(", ");
          const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
          // Simple fetch without nested relations for now
          const simpleCols = cols
            .split(",")
            .filter((c) => !c.includes("("))
            .map((c) => `"${c.trim()}"`)
            .join(", ");
          const allCols = simpleCols
            ? `${simpleCols}, "${actualFk}"`
            : `*, "${actualFk}"`;
          const relSql = `SELECT ${allCols} FROM "${this._schema}"."${relTable}" WHERE "${actualFk}" IN (${placeholders})`;
          try {
            const relRes = await this._pool.query(relSql, ids);
            const relMap = new Map<any, any[]>();
            for (const r of relRes.rows) {
              const key = r[actualFk];
              if (!relMap.has(key)) relMap.set(key, []);
              relMap.get(key)!.push(r);
            }
            for (const row of rows) {
              row[relName] = relMap.get(row.id) || [];
            }
          } catch (e) {
            // If relation query fails, set empty
            for (const row of rows) {
              row[relName] = [];
            }
          }
        }
      }
    }

    return rows;
  }

  private async _executeInsert(): Promise<QueryResult> {
    const rows = this._insertData;
    if (!rows || rows.length === 0) return { data: null, error: null };

    const keys = Object.keys(rows[0]);
    const colNames = keys.map((k) => `"${k}"`).join(", ");

    const allParams: any[] = [];
    const valueSets: string[] = [];

    for (const row of rows) {
      const placeholders: string[] = [];
      for (const key of keys) {
        allParams.push(row[key] !== undefined ? row[key] : null);
        placeholders.push(`$${allParams.length}`);
      }
      valueSets.push(`(${placeholders.join(", ")})`);
    }

    const where = this._buildWhereClause(allParams.length + 1);
    const sql = `INSERT INTO ${this._qualifiedTable()} (${colNames}) VALUES ${valueSets.join(", ")} RETURNING *`;
    const res = await this._pool.query(sql, [...allParams, ...where.params]);

    const data = res.rows;

    if (this._returnSingle) {
      return { data: data.length > 0 ? data[0] : null, error: null };
    }
    return { data: rows.length === 1 ? data[0] : data, error: null };
  }

  private async _executeUpdate(): Promise<QueryResult> {
    const keys = Object.keys(this._updateData);
    const setClauses: string[] = [];
    const params: any[] = [];

    for (const key of keys) {
      params.push(this._updateData[key]);
      setClauses.push(`"${key}" = $${params.length}`);
    }

    const where = this._buildWhereClause(params.length + 1);
    const sql = `UPDATE ${this._qualifiedTable()} SET ${setClauses.join(", ")} ${where.sql} RETURNING *`;
    const res = await this._pool.query(sql, [...params, ...where.params]);

    if (this._returnSingle) {
      return { data: res.rows.length > 0 ? res.rows[0] : null, error: null };
    }
    if (this._returnMaybeSingle) {
      return { data: res.rows.length > 0 ? res.rows[0] : null, error: null };
    }
    return { data: res.rows, error: null };
  }

  private async _executeDelete(): Promise<QueryResult> {
    const where = this._buildWhereClause(1);
    // If select was chained after delete, return data
    const sql = `DELETE FROM ${this._qualifiedTable()} ${where.sql} RETURNING *`;
    const res = await this._pool.query(sql, where.params);
    return { data: res.rows, error: null };
  }

  private async _executeUpsert(): Promise<QueryResult> {
    const rows = this._upsertData;
    if (!rows || rows.length === 0) return { data: null, error: null };

    const keys = Object.keys(rows[0]);
    const colNames = keys.map((k) => `"${k}"`).join(", ");

    const allParams: any[] = [];
    const valueSets: string[] = [];

    for (const row of rows) {
      const placeholders: string[] = [];
      for (const key of keys) {
        allParams.push(row[key] !== undefined ? row[key] : null);
        placeholders.push(`$${allParams.length}`);
      }
      valueSets.push(`(${placeholders.join(", ")})`);
    }

    const conflictCol = this._upsertConflict || "id";
    const updateCols = keys
      .filter((k) => k !== conflictCol)
      .map((k) => `"${k}" = EXCLUDED."${k}"`)
      .join(", ");

    const sql = `INSERT INTO ${this._qualifiedTable()} (${colNames}) VALUES ${valueSets.join(", ")}
      ON CONFLICT (${conflictCol
        .split(",")
        .map((c) => `"${c.trim()}"`)
        .join(", ")})
      DO UPDATE SET ${updateCols} RETURNING *`;

    const res = await this._pool.query(sql, allParams);

    if (this._returnSingle) {
      return { data: res.rows.length > 0 ? res.rows[0] : null, error: null };
    }
    return { data: res.rows, error: null };
  }

  private async _executeRpc(): Promise<QueryResult> {
    // Build function call with named params
    const paramKeys = Object.keys(this._rpcParams);
    const paramVals = paramKeys.map((k) => this._rpcParams[k]);
    const placeholders = paramKeys.map((k, i) => `"${k}" := $${i + 1}`);

    const sql = `SELECT * FROM "${this._schema}"."${this._rpcName}"(${placeholders.join(", ")})`;
    const res = await this._pool.query(sql, paramVals);

    // Unwrap single-column JSONB results to match Supabase REST API behavior
    // PostgreSQL returns { func_name: <value> } but Supabase returns <value> directly
    const unwrapRow = (row: any) => {
      if (!row || typeof row !== "object") return row;
      const keys = Object.keys(row);
      if (keys.length === 1 && keys[0] === this._rpcName) {
        return row[keys[0]];
      }
      return row;
    };

    if (this._returnSingle) {
      const row = res.rows.length > 0 ? res.rows[0] : null;
      return { data: unwrapRow(row), error: null };
    }

    // For non-single, if every row has just the function name column, unwrap all
    if (res.rows.length > 0) {
      const keys = Object.keys(res.rows[0]);
      if (keys.length === 1 && keys[0] === this._rpcName) {
        return { data: res.rows.map(unwrapRow), error: null };
      }
    }
    return { data: res.rows, error: null };
  }
}

// RPC result builder (subset of QueryBuilder for .single() etc after rpc)
type RpcBuilder = Pick<QueryBuilder, "single" | "maybeSingle" | "then">;

// Main client interface matching Supabase client API
class LocalClient {
  private _pool: Pool;
  private _schema: string;

  constructor(pool: Pool, schema: string = "menuca_v3") {
    this._pool = pool;
    this._schema = schema;
  }

  schema(name: string): LocalClient {
    return new LocalClient(this._pool, name);
  }

  from(table: string): QueryBuilder {
    const qb = new QueryBuilder(this._pool, this._schema);
    return qb.from(table);
  }

  rpc(name: string, params?: any): RpcBuilder {
    const qb = new QueryBuilder(this._pool, this._schema);
    return qb.rpc(name, params);
  }

  // Auth stub — replaced by local auth
  auth = {
    getUser: async () => ({
      data: { user: null },
      error: { message: "Use local auth" },
    }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async () => ({
      data: { user: null, session: null },
      error: { message: "Use local auth" },
    }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    exchangeCodeForSession: async () => ({
      data: { session: null },
      error: { message: "Use local auth" },
    }),
  };

  // Storage stub
  storage = {
    from: (bucket: string) => ({
      upload: async (path: string, file: any) => ({
        data: { path },
        error: null,
      }),
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `/storage/${bucket}/${path}` },
      }),
    }),
  };
}

export function createLocalClient(schema: string = "menuca_v3"): LocalClient {
  return new LocalClient(getPool(), schema);
}

export { getPool as localPool };
export type { LocalClient, QueryBuilder };
