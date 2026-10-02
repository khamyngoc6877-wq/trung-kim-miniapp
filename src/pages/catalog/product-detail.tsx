import HorizontalDivider from "@/components/horizontal-divider";
import { useAtomValue, useSetAtom } from "jotai";
import { useNavigate, useParams } from "react-router-dom";
import { productState, productsState } from "@/state";
import { formatPrice } from "@/utils/format";
import ShareButton from "./share-buttont";
import RelatedProducts from "./related-products";
import { useAddToCart } from "@/hooks";
import { Button } from "zmp-ui";
import Section from "@/components/section";
import { useTranslation } from "@/hooks/use-translation";
import { useEffect, useMemo, useState } from "react";
import type { ProductVariant } from "@/types";

export default function ProductDetailPage() {
  const { id } = useParams();
  const product = useAtomValue(productState(id ?? ""));
  const refreshProducts = useSetAtom(productsState);

  const navigate = useNavigate();
  const { t, language } = useTranslation();

  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Mỗi lần mở/chuyển sang trang chi tiết sản phẩm, lấy lại tồn kho mới nhất
  // từ backend/Supabase. Kết hợp với productsState dùng atomWithRefresh.
  useEffect(() => {
    void refreshProducts();
  }, [id, refreshProducts]);

  const variants = product?.variants ?? [];

  const productImages = useMemo(() => {
    const rawImages = (product as any)?.images;
    const images = Array.isArray(rawImages)
      ? rawImages
      : typeof rawImages === "string"
        ? rawImages.split(/\r?\n|,/)
        : [];

    return Array.from(
      new Set(
        [...images, (product as any)?.image]
          .map((url) => String(url ?? "").trim())
          .filter(Boolean),
      ),
    ) as string[];
  }, [(product as any)?.images, (product as any)?.image]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [product?.id]);

  useEffect(() => {
    if (!product) {
      setSelectedVariantId("");
      return;
    }

    if (variants.length === 0) {
      setSelectedVariantId("");
      return;
    }

    const firstAvailable =
      variants.find((variant) => Number(variant.stock) > 0) ??
      variants[0];

    setSelectedVariantId(String(firstAvailable?.id ?? ""));
  }, [product?.id]);

  const selectedVariant = useMemo<ProductVariant | undefined>(
    () =>
      variants.find(
        (variant) => String(variant.id) === selectedVariantId,
      ),
    [variants, selectedVariantId],
  );

  const { addToCart } = useAddToCart(product, selectedVariant);

  if (!product) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6 text-center">
        <div>
          <div className="font-medium">Không tìm thấy sản phẩm.</div>
          <div className="text-sm text-subtitle mt-1">
            Vui lòng quay lại danh sách sản phẩm và thử lại.
          </div>
        </div>
      </div>
    );
  }

  const displayPrice = selectedVariant
    ? Number(selectedVariant.price)
    : Number(product.price);

  const displayOriginalPrice = selectedVariant?.compareAtPrice
    ? Number(selectedVariant.compareAtPrice)
    : product.originalPrice;

  const outOfStock =
    selectedVariant !== undefined && Number(selectedVariant.stock) <= 0;

  // Nội dung sản phẩm theo ngôn ngữ đang chọn.
  // Nếu bản dịch chưa được nhập trong Admin thì tự dùng tiếng Việt.
  const displayName =
    language === "zh"
      ? product.nameZh || product.name
      : language === "en"
        ? product.nameEn || product.name
        : product.name;

  const displayDetail =
    language === "zh"
      ? product.detailZh || product.detail
      : language === "en"
        ? product.detailEn || product.detail
        : product.detail;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="w-full p-4 pb-2 space-y-4 bg-section">
          {productImages.length > 0 && (
            <div>
              <div
                className="flex w-full overflow-x-auto snap-x snap-mandatory rounded-lg"
                onScroll={(event) => {
                  const element = event.currentTarget;
                  if (element.clientWidth <= 0) return;
                  const nextIndex = Math.round(
                    element.scrollLeft / element.clientWidth,
                  );
                  setActiveImageIndex(
                    Math.max(0, Math.min(nextIndex, productImages.length - 1)),
                  );
                }}
                style={{
                  scrollbarWidth: "none",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {productImages.map((imageUrl, index) => (
                  <div
                    key={`${product.id}-${imageUrl}-${index}`}
                    className="w-full flex-none snap-center"
                  >
                    <img
                      src={imageUrl}
                      alt={`${displayName} ${index + 1}`}
                      className="w-full aspect-square object-contain rounded-lg bg-white"
                      style={
                        index === 0
                          ? { viewTransitionName: `product-image-${product.id}` }
                          : undefined
                      }
                    />
                  </div>
                ))}
              </div>

              {productImages.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-2">
                  {productImages.map((_, index) => (
                    <span
                      key={index}
                      className={[
                        "block rounded-full transition-all",
                        index === activeImageIndex
                          ? "w-4 h-1.5 bg-primary"
                          : "w-1.5 h-1.5 bg-gray-300",
                      ].join(" ")}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="text-xl font-bold text-primary">
              {formatPrice(displayPrice)}
            </div>

            {displayOriginalPrice &&
              Number(displayOriginalPrice) > displayPrice && (
                <div className="text-2xs space-x-0.5">
                  <span className="text-subtitle line-through">
                    {formatPrice(Number(displayOriginalPrice))}
                  </span>
                  <span className="text-danger">
                    -
                    {100 -
                      Math.round(
                        (displayPrice * 100) /
                          Number(displayOriginalPrice),
                      )}
                    %
                  </span>
                </div>
              )}

            <div className="text-sm mt-1">{displayName}</div>
          </div>

          {variants.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">
                Chọn quy cách
              </div>

              <div className="flex flex-wrap gap-2">
                {variants.map((variant) => {
                  const active =
                    String(variant.id) === selectedVariantId;
                  const soldOut = Number(variant.stock) <= 0;

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={soldOut}
                      onClick={() =>
                        setSelectedVariantId(String(variant.id))
                      }
                      className={[
                        "px-3 py-2 rounded-lg border text-sm",
                        active
                          ? "border-primary font-semibold"
                          : "border-gray-200",
                        soldOut
                          ? "opacity-40 cursor-not-allowed"
                          : "",
                      ].join(" ")}
                    >
                      <div>{variant.name}</div>
                      <div className="text-xs mt-0.5">
                        {formatPrice(Number(variant.price))}
                      </div>
                      <div className="text-2xs text-subtitle mt-0.5">
                        Còn {Number(variant.stock)} sản phẩm
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <ShareButton product={product} />
        </div>

        {displayDetail && (
          <>
            <div className="bg-background h-2 w-full"></div>
            <Section title={t("product", "description")}>
              <div className="text-sm whitespace-pre-wrap text-subtitle p-4 pt-2">
                {displayDetail}
              </div>
            </Section>
          </>
        )}

        <div className="bg-background h-2 w-full"></div>
        <Section title={t("product", "related")}>
          <RelatedProducts currentProductId={product.id as any} />
        </Section>
      </div>

      <HorizontalDivider />

      <div className="flex-none grid grid-cols-2 gap-2 py-3 px-4 bg-section">
        <Button
          variant="tertiary"
          disabled={outOfStock}
          onClick={() => {
            addToCart(1, {
              toast: true,
            });
          }}
        >
          {outOfStock ? "Hết hàng" : t("product", "addToCart")}
        </Button>

        <Button
          disabled={outOfStock}
          onClick={() => {
            addToCart(1);
            navigate("/cart", {
              viewTransition: true,
            });
          }}
        >
          {outOfStock ? "Hết hàng" : t("product", "buyNow")}
        </Button>
      </div>
    </div>
  );
}
