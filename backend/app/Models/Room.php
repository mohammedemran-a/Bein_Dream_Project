<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Room extends Model
{
    protected $table = 'rooms';

    protected $fillable = [
        'category',
        'name',
        'price',
        'status',
        'capacity',
        'description',
        'features',
        'image_path',
    ];

    // إظهار الحقل المحسوب
    protected $appends = ['remaining_capacity'];

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * ✅ حساب السعة المتبقية بدون استعلام إضافي
     */
    public function getRemainingCapacityAttribute()
    {
        $bookedGuests = $this->bookings_sum_guests ?? 0;
        return max($this->capacity - $bookedGuests, 0);
    }
}
