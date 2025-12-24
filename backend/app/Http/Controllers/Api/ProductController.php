<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    /**
     * عرض جميع المنتجات
     */
    public function index()
    {
        return response()->json(Product::all());
    }

    /**
     * إضافة منتج جديد
     */
    public function store(Request $request)
    {
        $request->validate([
            'type' => 'required|string',
            'name' => 'required|string',
            'price' => 'required|numeric',
            'stock' => 'required|integer',
            'category' => 'required|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg|max:10240',
        ]);

        $data = $request->all();

        // ✅ حفظ الصورة (المسار فقط)
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products', 'public');
            $data['image'] = $path; // products/xxx.jpg
        }

        $product = Product::create($data);

        return response()->json($product, 201);
    }

    /**
     * عرض منتج محدد
     */
    public function show(Product $product)
    {
        return response()->json($product);
    }

    /**
     * تحديث منتج
     */
    public function update(Request $request, Product $product)
    {
        $request->validate([
            'type' => 'sometimes|string',
            'name' => 'sometimes|string',
            'price' => 'sometimes|numeric',
            'stock' => 'sometimes|integer',
            'category' => 'sometimes|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg|max:10240',
        ]);

        $data = $request->all();

        if ($request->hasFile('image')) {
            // حذف الصورة القديمة
            if ($product->image) {
                Storage::disk('public')->delete($product->image);
            }

            $path = $request->file('image')->store('products', 'public');
            $data['image'] = $path;
        }

        $product->update($data);

        return response()->json($product);
    }

    /**
     * حذف منتج
     */
    public function destroy(Product $product)
    {
        if ($product->image) {
            Storage::disk('public')->delete($product->image);
        }

        $product->delete();

        return response()->json(null, 204);
    }
}
