// src/pages/admin/AdminServices.tsx
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/useAuthStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  Product,
} from "@/api/products";
import { BASE_URL } from "@/api/axios";

const categories = ["البقالة", "القات", "الشيشة", "الكروت", "القهوة"];

const AdminServices = () => {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [form, setForm] = useState({
    type: "البقالة",
    name: "",
    price: "",
    stock: "",
    category: "",
    image: null as File | null,
  });

  // =============================
  // جلب المنتجات
  // =============================
  const { data: products = [], isLoading, isFetching } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
    enabled: hasPermission("services_view"),
  });

  // =============================
  // حفظ / تعديل
  // =============================
  const saveMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null) {
          if (key === "image" && value instanceof File) {
            formData.append(key, value);
          } else {
            formData.append(key, String(value));
          }
        }
      });

      return editingProduct
        ? updateProduct(editingProduct.id, formData)
        : createProduct(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsDialogOpen(false);
      setEditingProduct(null);
      resetForm();
    },
  });

  // =============================
  // حذف
  // =============================
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  // =============================
  // أدوات الفورم
  // =============================
  const updateFormField = (
    key: keyof typeof form,
    value: string | File | null
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm({
      type: "البقالة",
      name: "",
      price: "",
      stock: "",
      category: "",
      image: null,
    });
  };

  const handleEdit = (product: Product) => {
    if (!hasPermission("services_edit")) {
      alert("🚫 ليس لديك صلاحية التعديل!");
      return;
    }

    setEditingProduct(product);
    setForm({
      type: product.type,
      name: product.name,
      price: String(product.price),
      stock: String(product.stock),
      category: product.category,
      image: null,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!hasPermission("services_delete")) {
      alert("🚫 ليس لديك صلاحية الحذف!");
      return;
    }

    if (confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
      deleteMutation.mutate(id);
    }
  };

  // =============================
  // جدول المنتجات
  // =============================
  const ProductsTable = ({ type }: { type: string }) => {
    const filtered = Array.isArray(products)
      ? products.filter((p) => p.type === type)
      : [];

    return (
      <div dir="rtl" className="overflow-x-auto">
        {isFetching && !isLoading && (
          <p className="text-right text-gray-400 text-sm mb-2 animate-pulse">
            جارٍ تحديث البيانات...
          </p>
        )}

        <Table className="min-w-full text-center">
          <TableHeader>
            <TableRow>
              <TableHead className="text-center w-[150px]">الصورة</TableHead>
              <TableHead className="text-center w-[250px]">الاسم</TableHead>
              <TableHead className="text-center w-[150px]">السعر</TableHead>
              <TableHead className="text-center w-[120px]">الكمية</TableHead>
              <TableHead className="text-center w-[150px]">الفئة</TableHead>
              <TableHead className="text-center w-[150px]">العمليات</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <img
                    src={`${BASE_URL}/storage/${product.image}`}
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded border"
                  />
                </TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.price} ريال</TableCell>
                <TableCell>{product.stock}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{product.category}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 justify-end">
                    {hasPermission("services_edit") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(product)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {hasPermission("services_delete") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-gray-500">
                  لا توجد منتجات في هذا التصنيف
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  // =============================
  // صلاحيات
  // =============================
  if (!hasPermission("services_view")) {
    return (
      <AdminLayout>
        <p className="text-center text-red-600 text-lg mt-10">
          🚫 ليس لديك صلاحية عرض المنتجات
        </p>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <p className="text-center text-gray-500 mt-10">
          جارٍ تحميل المنتجات...
        </p>
      </AdminLayout>
    );
  }

  // =============================
  // الواجهة
  // =============================
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">إدارة المنتجات</h1>

          {hasPermission("services_create") && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="gap-2"
                  onClick={() => {
                    resetForm();
                    setEditingProduct(null);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  إضافة منتج جديد
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingProduct
                      ? "قم بتعديل بيانات المنتج ثم اضغط تحديث."
                      : "املأ بيانات المنتج ثم اضغط حفظ."}
                  </DialogDescription>
                </DialogHeader>

                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveMutation.mutate();
                  }}
                >
                  <div>
                    <Label>التصنيف</Label>
                    <select
                      className="w-full border rounded-md p-2"
                      value={form.type}
                      onChange={(e) =>
                        updateFormField("type", e.target.value)
                      }
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>اسم المنتج</Label>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        updateFormField("name", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>السعر</Label>
                      <Input
                        type="number"
                        value={form.price}
                        onChange={(e) =>
                          updateFormField("price", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label>الكمية</Label>
                      <Input
                        type="number"
                        value={form.stock}
                        onChange={(e) =>
                          updateFormField("stock", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label>الفئة</Label>
                    <Input
                      value={form.category}
                      onChange={(e) =>
                        updateFormField("category", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <Label>صورة المنتج</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        updateFormField(
                          "image",
                          e.target.files?.[0] ?? null
                        )
                      }
                    />

                    {editingProduct?.image && (
                      <img
                        src={`${BASE_URL}/storage/${editingProduct.image}`}
                        className="w-24 h-24 object-cover rounded mt-2"
                      />
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      إلغاء
                    </Button>
                    <Button type="submit">
                      {editingProduct ? "تحديث" : "حفظ"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div dir="rtl">
          <Tabs defaultValue="البقالة">
            <TabsList className="grid grid-cols-5">
              {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat}>
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((cat) => (
              <TabsContent key={cat} value={cat}>
                <Card>
                  <CardHeader className="text-right">
                    <CardTitle>{cat}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ProductsTable type={cat} />
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminServices;
