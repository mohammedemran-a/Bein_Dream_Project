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
     * 🟢 عرض جميع المنتجات (مع كاش 10 دقائق)
     */
    public function index()
    {
        $products = Cache::remember('products.all', now()->addMinutes(10), function () {
            return Product::all();
        });

        return response()->json($products);
    }

    /**
     * 🟢 إضافة منتج جديد
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

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products', 'public');
            $data['image'] = asset('storage/' . $path);
        }

        $product = Product::create($data);

        // 🔥 تفريغ الكاش بعد الإضافة
        Cache::forget('products.all');

        return response()->json($product, 201);
    }

    /**
     * 🟢 عرض منتج محدد
     */
    public function show(Product $product)
    {
        return response()->json($product);
    }

    /**
     * 🟡 تحديث منتج موجود
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
            if ($product->image) {
                $oldPath = str_replace(asset('storage') . '/', '', $product->image);
                Storage::disk('public')->delete($oldPath);
            }

            $path = $request->file('image')->store('products', 'public');
            $data['image'] = asset('storage/' . $path);
        }

        $product->update($data);

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
            $oldPath = str_replace(asset('storage') . '/', '', $product->image);
            Storage::disk('public')->delete($oldPath);
        }

        $product->delete();

        // 🔥 تفريغ الكاش بعد الحذف
        Cache::forget('products.all');

        return response()->json(null, 204);
    }
}
