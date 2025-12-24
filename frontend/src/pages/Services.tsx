import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/layout/BottomNav";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { getProducts, Product } from "@/api/products.ts";
import { useAuthStore } from "@/store/useAuthStore";

// -------------------------
// بطاقة الخدمة
// -------------------------
const ServiceCard = ({
  item,
  addToCart,
}: {
  item: Product;
  addToCart: (product: Product, quantity: number, userId: number) => void;
}) => {
  const [quantity, setQuantity] = useState(1);

  return (
    <Card className="overflow-hidden hover-lift card-gradient border-2">
      {/* ✅ هذا الـ div كان ناقص الإغلاق */}
      <div className="h-48 overflow-hidden"></div>

      <CardHeader>
        <CardTitle>{item.name}</CardTitle>

        {item.description && (
          <CardDescription className="text-sm mt-1">
            {item.description}
          </CardDescription>
        )}

        <CardDescription className="text-2xl font-bold text-primary mt-2">
          {item.price} ريال
        </CardDescription>

        <div className="flex items-center mt-2 gap-2">
          <Button
            size="sm"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            -
          </Button>

          <input
            type="number"
            className="w-12 text-center border rounded"
            value={quantity}
            min={1}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />

          <Button size="sm" onClick={() => setQuantity((q) => q + 1)}>
            +
          </Button>
        </div>
      </CardHeader>

      <CardFooter>
        <Button
          onClick={() => addToCart(item, quantity, item.userId!)}
          className="w-full shadow-elegant"
        >
          أضف إلى السلة
        </Button>
      </CardFooter>
    </Card>
  );
};

// -------------------------
// صفحة الخدمات
// -------------------------
const Services = () => {
  const { addItem } = useCart();
  const { user } = useAuthStore();
  const categories = ["البقالة", "القات", "الشيشة", "الكروت", "القهوة"];

  const {
    data: products = [],
    isLoading,
    isError,
    error,
  } = useQuery<Product[], Error>({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  useEffect(() => {
    if (isError) {
      console.error("حدث خطأ أثناء جلب المنتجات:", error);
      toast.error("تعذر تحميل المنتجات ❌");
    }
  }, [isError, error]);

  const filterByCategory = (category: string) =>
    products.filter((p) => p.type === category);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-16">
        <section className="bg-gradient-to-b from-primary/10 to-background py-20 px-4">
          <div className="container mx-auto text-center space-y-4 animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold">
              خدماتنا المتميزة
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              اطلب ما تحتاجه من خدمات متنوعة بكل سهولة
            </p>
          </div>
        </section>

        <section className="py-12 px-4">
          <div className="container mx-auto">
            <Tabs defaultValue="البقالة" className="w-full" dir="rtl">
              <TabsList className="grid w-full grid-cols-5 mb-8 h-auto">
                {categories.map((c) => (
                  <TabsTrigger key={c} value={c} className="gap-2 py-3">
                    <ShoppingCart className="h-5 w-5" />
                    <span>{c}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {categories.map((category) => (
                <TabsContent
                  key={category}
                  value={category}
                  className="animate-fade-in"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filterByCategory(category).length > 0 ? (
                      filterByCategory(category).map((item, index) => (
                        <div
                          key={item.id}
                          style={{
                            animationDelay: `${index * 0.05}s`,
                          }}
                        >
                          <ServiceCard
                            item={{
                              ...item,
                              price: Number(item.price),
                              image: item.image || "",
                              userId: user?.id,
                            }}
                            addToCart={(product, quantity, userId) =>
                              addItem(
                                {
                                  id: product.id,
                                  name: product.name,
                                  price: Number(product.price),
                                  image: product.image || "",
                                  category: product.category,
                                  userId: user?.id,
                                },
                                quantity
                              )
                            }
                          />
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-6">
                        لا توجد منتجات في هذه الفئة
                      </p>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </section>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
};

export default Services;
