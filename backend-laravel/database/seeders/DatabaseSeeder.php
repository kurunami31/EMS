<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        if (!User::where('email', 'admin@ems.local')->exists()) {
            User::create([
                'email' => 'admin@ems.local',
                'display_name' => 'System Administrator',
                'password_hash' => Hash::make('admin123'),
                'role' => 'admin',
                'is_active' => true,
            ]);
        }
    }
}
