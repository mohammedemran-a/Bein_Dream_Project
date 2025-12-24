<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;

class ProductController extends Controller
{
    /**
     * 🟢 عرض جميع المنتجات (كاش فقط)
     */
    public function index()
    {
        $products = Cache::remember(
            'products.all',
            now()->addMinutes(10),
            function () {
                return Product::all();
            }
        );

        return response()->json($products);
    }

    /**
     * 🟢 إضافة منتج
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type'     => 'required|string',
            'name'     => 'required|string',
            'price'    => 'required|numeric',
            'stock'    => 'required|integer',
            'category' => 'required|string',
            'image'    => 'nullable|image|mimes:jpeg,png,jpg|max:10240',
        ]);

        if ($request->hasFile('image')) {
            // ⛔ نفس المسار تمامًا كما كان
            $validated['image'] = $request->file('image')->store('products', 'public');
        }

        $product = Product::create($validated);

        // 🔥 تفريغ الكاش بعد الإضافة
        Cache::forget('products.all');

        return response()->json($product, 201);
    }

    /**
     * 🟢 عرض منتج واحد
     */
    public function show(Product $product)
    {
        return response()->json($product);
    }

    /**
     * 🟡 تحديث منتج
     */
    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'type'     => 'sometimes|string',
            'name'     => 'sometimes|string',
            'price'    => 'sometimes|numeric',
            'stock'    => 'sometimes|integer',
            'category' => 'sometimes|string',
            'image'    => 'nullable|image|mimes:jpeg,png,jpg|max:10240',
        ]);

        if ($request->hasFile('image')) {
            // حذف القديمة فقط
            if ($product->image) {
                Storage::disk('public')->delete($product->image);
            }

            // نفس المسار القديم
            $validated['image'] = $request->file('image')->store('products', 'public');
        }

        $product->update($validated);

        // 🔥 تفريغ الكاش بعد التحديث
        Cache::forget('products.all');

        return response()->json($product);
    }

    /**
     * 🔴 حذف منتج
     */
    public function destroy(Product $product)
    {
        if ($product->image) {
            Storage::disk('public')->delete($product->image);
        }

        $product->delete();

        // 🔥 تفريغ الكاش بعد الحذف
        Cache::forget('products.all');

        return response()->json(null, 204);
    }
}
