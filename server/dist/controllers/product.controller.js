import { createProduct, deleteProduct, getProduct, listProducts, updateProduct, } from "../services/product.service.js";
function validate(body) {
    if (!String(body.sku ?? "").trim())
        return "Thiếu mã sản phẩm";
    if (!String(body.name ?? "").trim())
        return "Thiếu tên sản phẩm";
    if (!String(body.category ?? "").trim())
        return "Thiếu danh mục";
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
        return "Giá bán không hợp lệ";
    }
    const stock = Number(body.stock);
    if (!Number.isFinite(stock) || stock < 0) {
        return "Tồn kho không hợp lệ";
    }
    return null;
}
function getParamId(req) {
    return String(req.params.id ?? "").trim();
}
export async function publicList(_req, res) {
    res.json(await listProducts(false));
}
export async function publicGet(req, res) {
    const id = getParamId(req);
    if (!id) {
        res.status(400).json({
            message: "ID sản phẩm không hợp lệ",
        });
        return;
    }
    const product = await getProduct(id);
    if (!product || product.status !== "active") {
        res.status(404).json({
            message: "Không tìm thấy sản phẩm",
        });
        return;
    }
    res.json(product);
}
export async function adminList(_req, res) {
    res.json(await listProducts(true));
}
export async function adminCreate(req, res) {
    const input = req.body;
    const error = validate(input);
    if (error) {
        res.status(400).json({ message: error });
        return;
    }
    res.status(201).json(await createProduct(input));
}
export async function adminUpdate(req, res) {
    const id = getParamId(req);
    if (!id) {
        res.status(400).json({
            message: "ID sản phẩm không hợp lệ",
        });
        return;
    }
    const current = await getProduct(id);
    if (!current) {
        res.status(404).json({
            message: "Không tìm thấy sản phẩm",
        });
        return;
    }
    const input = req.body;
    const merged = {
        sku: input.sku ?? current.sku,
        name: input.name ?? current.name,
        nameZh: input.nameZh ?? current.nameZh,
        category: input.category ?? current.category,
        brand: input.brand ?? current.brand,
        price: input.price ?? current.price,
        compareAtPrice: input.compareAtPrice ?? current.compareAtPrice,
        stock: input.stock ?? current.stock,
        description: input.description ?? current.description,
        specifications: input.specifications ?? current.specifications,
        images: input.images ?? current.images,
        variants: input.variants ?? current.variants,
        status: input.status ?? current.status,
    };
    const error = validate(merged);
    if (error) {
        res.status(400).json({ message: error });
        return;
    }
    const updated = await updateProduct(id, input);
    if (!updated) {
        res.status(404).json({
            message: "Không tìm thấy sản phẩm",
        });
        return;
    }
    res.json(updated);
}
export async function adminDelete(req, res) {
    const id = getParamId(req);
    if (!id) {
        res.status(400).json({
            message: "ID sản phẩm không hợp lệ",
        });
        return;
    }
    const ok = await deleteProduct(id);
    if (!ok) {
        res.status(404).json({
            message: "Không tìm thấy sản phẩm",
        });
        return;
    }
    res.status(204).end();
}
