<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FootballMatch;
use App\Models\Prediction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class FootballMatchController extends Controller
{
    protected $timezone = 'Asia/Riyadh'; // ضبط التوقيت المحلي

    /**
     * 🟢 عرض جميع المباريات وتحديث الحالة تلقائيًا
     */
    public function index()
    {
        $now = Carbon::now($this->timezone);

        $matches = FootballMatch::orderBy('date', 'asc')->get();

        foreach ($matches as $match) {
            $matchStart = Carbon::parse($match->date . ' ' . $match->time, $this->timezone);
            $matchEnd = $matchStart->copy()->addMinutes(100); // مدة المباراة تقريبية

            // تحديث الحالة تلقائيًا
            if ($match->status === 'قادمة' && $now->gte($matchStart) && $now->lt($matchEnd)) {
                $match->update(['status' => 'جارية']);
            } elseif ($match->status !== 'منتهية' && $now->gte($matchEnd)) {
                $match->update(['status' => 'منتهية']);
            }
        }

        return response()->json($matches);
    }

    /**
     * 🟢 إضافة مباراة جديدة + رفع الشعارات
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'team1'       => 'required|string|max:255',
            'team2'       => 'required|string|max:255',
            'team1_logo'  => 'nullable|image|mimes:jpg,jpeg,png|max:10240',
            'team2_logo'  => 'nullable|image|mimes:jpg,jpeg,png|max:10240',
            'date'        => 'required|date',
            'time'        => 'required',
            'channel'     => 'required|string|max:255',
            'result'      => 'nullable|string|max:255',
            'status'      => 'required|in:قادمة,منتهية,جارية',
        ]);

        // ضبط الوقت بشكل صحيح
        $validated['time'] = date('H:i:s', strtotime($validated['time']));

        if ($request->hasFile('team1_logo')) {
            $validated['team1_logo'] = $request->file('team1_logo')->store('logos', 'public');
        }

        if ($request->hasFile('team2_logo')) {
            $validated['team2_logo'] = $request->file('team2_logo')->store('logos', 'public');
        }

        $match = FootballMatch::create($validated);

        return response()->json([
            'message' => '✅ تمت إضافة المباراة بنجاح',
            'data' => $match,
        ], 201);
    }

    /**
     * 🟢 عرض مباراة واحدة
     */
    public function show($id)
    {
        $match = FootballMatch::findOrFail($id);
        return response()->json($match);
    }

    /**
     * ✏️ تحديث مباراة + تحديث الشعارات + تحديث الحالة
     */
    public function update(Request $request, $id)
    {
        $match = FootballMatch::findOrFail($id);

        $validated = $request->validate([
            'team1'       => 'sometimes|string|max:255',
            'team2'       => 'sometimes|string|max:255',
            'team1_logo'  => 'nullable|image|mimes:jpg,jpeg,png|max:10240',
            'team2_logo'  => 'nullable|image|mimes:jpg,jpeg,png|max:10240',
            'date'        => 'sometimes|date',
            'time'        => 'sometimes',
            'channel'     => 'sometimes|string|max:255',
            'result'      => 'nullable|string|max:255',
            'status'      => 'sometimes|in:قادمة,منتهية,جارية',
        ]);

        if (isset($validated['time'])) {
            $validated['time'] = date('H:i:s', strtotime($validated['time']));
        }

        // تحديث الشعارات إذا تم رفعها
        if ($request->hasFile('team1_logo')) {
            if ($match->team1_logo && Storage::disk('public')->exists($match->team1_logo)) {
                Storage::disk('public')->delete($match->team1_logo);
            }
            $validated['team1_logo'] = $request->file('team1_logo')->store('logos', 'public');
        }

        if ($request->hasFile('team2_logo')) {
            if ($match->team2_logo && Storage::disk('public')->exists($match->team2_logo)) {
                Storage::disk('public')->delete($match->team2_logo);
            }
            $validated['team2_logo'] = $request->file('team2_logo')->store('logos', 'public');
        }

        // تحديث البيانات
        $match->update($validated);

        // 🔹 تحديث الحالة تلقائيًا
        $now = Carbon::now($this->timezone);
        $matchStart = Carbon::parse($match->date . ' ' . $match->time, $this->timezone);
        $matchEnd = $matchStart->copy()->addMinutes(100);

        if ($match->status === 'قادمة' && $now->gte($matchStart) && $now->lt($matchEnd)) {
            $match->update(['status' => 'جارية']);
        } elseif ($match->status !== 'منتهية' && $now->gte($matchEnd)) {
            $match->update(['status' => 'منتهية']);
        }

        // 🎯 حساب النقاط إذا انتهت المباراة
        if ($match->status === 'منتهية' && !empty($match->result) && strpos($match->result, '-') !== false) {
            [$team1Score, $team2Score] = explode('-', $match->result);
            $predictions = Prediction::where('football_match_id', $match->id)->get();

            foreach ($predictions as $prediction) {
                $points = 0;
                if ($prediction->team1_score == $team1Score && $prediction->team2_score == $team2Score) {
                    $points = 3;
                } elseif (
                    ($team1Score > $team2Score && $prediction->team1_score > $prediction->team2_score) ||
                    ($team1Score < $team2Score && $prediction->team1_score < $prediction->team2_score) ||
                    ($team1Score == $team2Score && $prediction->team1_score == $prediction->team2_score)
                ) {
                    $points = 1;
                }
                $prediction->update(['points' => $points]);
            }
        }

        return response()->json([
            'message' => '✏️ تم تحديث المباراة بنجاح',
            'data' => $match,
        ]);
    }

    /**
     * 🗑️ حذف مباراة + حذف الشعارات
     */
    public function destroy($id)
    {
        $match = FootballMatch::findOrFail($id);

        if ($match->team1_logo && Storage::disk('public')->exists($match->team1_logo)) {
            Storage::disk('public')->delete($match->team1_logo);
        }

        if ($match->team2_logo && Storage::disk('public')->exists($match->team2_logo)) {
            Storage::disk('public')->delete($match->team2_logo);
        }

        $match->delete();

        return response()->json(['message' => '🗑️ تم حذف المباراة بنجاح']);
    }
}
