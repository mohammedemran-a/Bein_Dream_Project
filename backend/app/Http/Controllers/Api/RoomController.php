<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;

class RoomController extends Controller
{
    /**
     * 🟢 جلب جميع الغرف (مع كاش)
     */
    public function index()
    {
        $rooms = Cache::remember('rooms.all', now()->addMinutes(10), function () {
            return Room::withSum(
                ['bookings as bookings_sum_guests' => function ($q) {
                    $q->whereNotIn('status', ['ملغى', 'منتهي']);
                }],
                'guests'
            )->get();
        });

        return response()->json($rooms);
    }

    /**
     * 🟢 جلب غرفة واحدة
     */
    public function show($id)
    {
        $room = Room::withSum(
            ['bookings as bookings_sum_guests' => function ($q) {
                $q->whereNotIn('status', ['ملغى', 'منتهي']);
            }],
            'guests'
        )->findOrFail($id);

        return response()->json($room);
    }

    /**
     * 🆕 إنشاء غرفة
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'category' => 'required|in:غرف خاصة,غرف عامة,صالات المناسبات,غرف البلايستيشن,صالات البلياردو',
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'status' => 'required|in:متاح,محجوز',
            'capacity' => 'required|integer|min:1',
            'description' => 'nullable|string',
            'features' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpg,jpeg,png|max:10240',
        ]);

        if ($request->hasFile('image')) {
            $validated['image_path'] =
                $request->file('image')->store('rooms', 'public');
        }

        $room = Room::create($validated);

        // 🔥 تفريغ الكاش
        Cache::forget('rooms.all');

        return response()->json($room, 201);
    }

    /**
     * ✏️ تحديث غرفة
     */
    public function update(Request $request, $id)
    {
        $room = Room::findOrFail($id);

        $validated = $request->validate([
            'category' => 'required|in:غرف خاصة,غرف عامة,صالات المناسبات,غرف البلايستيشن,صالات البلياردو',
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'status' => 'required|in:متاح,محجوز',
            'capacity' => 'required|integer|min:1',
            'description' => 'nullable|string',
            'features' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpg,jpeg,png|max:10240',
        ]);

        if ($request->hasFile('image')) {
            if ($room->image_path) {
                Storage::disk('public')->delete($room->image_path);
            }

            $validated['image_path'] =
                $request->file('image')->store('rooms', 'public');
        }

        $room->update($validated);

        // 🔥 تفريغ الكاش
        Cache::forget('rooms.all');

        return response()->json($room);
    }

    /**
     * 🔴 حذف غرفة
     */
    public function destroy($id)
    {
        $room = Room::findOrFail($id);

        if ($room->image_path) {
            Storage::disk('public')->delete($room->image_path);
        }

        $room->delete();

        // 🔥 تفريغ الكاش
        Cache::forget('rooms.all');

        return response()->json(['message' => 'تم حذف الغرفة بنجاح']);
    }
}
