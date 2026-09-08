import crypto from "node:crypto";
import { pool } from "../lib/db.js";
const n = (v) => Number(v ?? 0);
const optNum = (v) => v === null || v === undefined ? undefined : Number(v);
const iso = (v) => new Date(v).toISOString();
function normalizeVariants(variants = []) {
    return variants.map((v) => ({
        ...v,
        id: String(v.id ?? "").trim() || crypto.randomUUID(),
        name: String(v.name ?? "").trim(),
        sku: v.sku ? String(v.sku).trim() : undefined,
        price: n(v.price),
        stock: n(v.stock),
        compareAtPrice: v.compareAtPrice !== undefined ? n(v.compareAtPrice) : undefined,
    }));
}
function mapProduct(row, variants) {
    const images = Array.isArray(row.images) ? row.images.map(String) : [];
    return {
        id: row.id,
        sku: row.sku,
        name: row.name,
        nameZh: row.name_zh ?? undefined,
        category: row.category,
        brand: row.brand ?? undefined,
        price: n(row.price),
        compareAtPrice: optNum(row.compare_at_price),
        stock: n(row.stock),
        description: row.description ?? undefined,
        specifications: row.specifications,
        images,
        variants: variants.map((v) => ({
            id: v.id,
            name: v.name,
            sku: v.sku ?? undefined,
            price: n(v.price),
            stock: n(v.stock),
            compareAtPrice: optNum(v.compare_at_price),
        })),
        status: row.status,
        createdAt: iso(row.created_at),
        updatedAt: iso(row.updated_at),
    };
}
async function variantsFor(productIds) {
    const map = new Map();
    if (!productIds.length)
        return map;
    const result = await pool.query(`select id,product_id,name,sku,price,stock,compare_at_price
       from public.product_variants
      where product_id=any($1::text[])
      order by created_at asc`, [productIds]);
    for (const v of result.rows) {
        const list = map.get(v.product_id) ?? [];
        list.push(v);
        map.set(v.product_id, list);
    }
    return map;
}
export async function listProducts(includeHidden = false) {
    const result = await pool.query(`select * from public.products
      ${includeHidden ? "" : "where status='active'"}
      order by updated_at desc`);
    const vm = await variantsFor(result.rows.map((r) => r.id));
    return result.rows.map((r) => mapProduct(r, vm.get(r.id) ?? []));
}
export async function getProduct(id) {
    const productId = String(id).trim();
    if (!productId)
        return undefined;
    const result = await pool.query(`select * from public.products where id=$1 limit 1`, [productId]);
    const row = result.rows[0];
    if (!row)
        return undefined;
    const vm = await variantsFor([row.id]);
    return mapProduct(row, vm.get(row.id) ?? []);
}
async function replaceVariants(client, productId, variants) {
    await client.query(`delete from public.product_variants where product_id=$1`, [productId]);
    for (const v of normalizeVariants(variants)) {
        await client.query(`insert into public.product_variants
       (id,product_id,name,sku,price,stock,compare_at_price,created_at,updated_at)
       values($1,$2,$3,$4,$5,$6,$7,now(),now())`, [v.id, productId, v.name, v.sku ?? null, v.price, v.stock, v.compareAtPrice ?? null]);
    }
}
export async function createProduct(input) {
    const id = crypto.randomUUID();
    const client = await pool.connect();
    try {
        await client.query("begin");
        await client.query(`insert into public.products
       (id,sku,name,name_zh,category,brand,price,compare_at_price,stock,description,
        specifications,images,status,created_at,updated_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,now(),now())`, [id, String(input.sku ?? "").trim(), String(input.name ?? "").trim(),
            input.nameZh ? String(input.nameZh).trim() : null, String(input.category ?? "").trim(),
            input.brand ? String(input.brand).trim() : null, n(input.price),
            input.compareAtPrice !== undefined ? n(input.compareAtPrice) : null, n(input.stock),
            input.description ?? null,
            input.specifications === undefined ? null : JSON.stringify(input.specifications),
            JSON.stringify(Array.isArray(input.images) ? input.images.map(String).filter(Boolean) : []),
            input.status === "hidden" ? "hidden" : "active"]);
        await replaceVariants(client, id, Array.isArray(input.variants) ? input.variants : []);
        await client.query("commit");
    }
    catch (e) {
        await client.query("rollback");
        throw e;
    }
    finally {
        client.release();
    }
    return (await getProduct(id));
}
export async function updateProduct(id, input) {
    const current = await getProduct(id);
    if (!current)
        return undefined;
    const next = { ...current, ...input };
    const client = await pool.connect();
    try {
        await client.query("begin");
        await client.query(`update public.products set
       sku=$2,name=$3,name_zh=$4,category=$5,brand=$6,price=$7,compare_at_price=$8,
       stock=$9,description=$10,specifications=$11::jsonb,images=$12::jsonb,status=$13,updated_at=now()
       where id=$1`, [current.id, String(next.sku ?? "").trim(), String(next.name ?? "").trim(),
            next.nameZh ? String(next.nameZh).trim() : null, String(next.category ?? "").trim(),
            next.brand ? String(next.brand).trim() : null, n(next.price),
            next.compareAtPrice !== undefined ? n(next.compareAtPrice) : null, n(next.stock),
            next.description ?? null,
            next.specifications === undefined ? null : JSON.stringify(next.specifications),
            JSON.stringify(Array.isArray(next.images) ? next.images.map(String).filter(Boolean) : []),
            next.status === "hidden" ? "hidden" : "active"]);
        if (input.variants !== undefined)
            await replaceVariants(client, current.id, input.variants);
        await client.query("commit");
    }
    catch (e) {
        await client.query("rollback");
        throw e;
    }
    finally {
        client.release();
    }
    return getProduct(current.id);
}
export async function deleteProduct(id) {
    const result = await pool.query(`delete from public.products where id=$1 returning id`, [String(id).trim()]);
    return (result.rowCount ?? 0) > 0;
}
