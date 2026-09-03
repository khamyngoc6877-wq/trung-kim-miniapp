// GHÉP VÀO server/src/app.ts HIỆN TẠI
import path from "node:path";
import { fileURLToPath } from "node:url";
import productRoutes from "./routes/product.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sau app.use(express.json())
app.use("/api/products", productRoutes);
app.use("/admin", express.static(path.resolve(__dirname, "../public/admin")));
