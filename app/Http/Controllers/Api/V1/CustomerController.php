<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\Customers\CustomerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class CustomerController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:order.create')];
    }

    public function index(Request $request, CustomerService $customers): JsonResponse
    {
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
        ]);

        $results = $customers->search($data['q'] ?? '', 15)->map(fn (Customer $customer) => [
            'id' => $customer->id,
            'name' => $customer->name,
            'phone' => $customer->phone,
            'email' => $customer->email,
            'loyalty_points' => $customer->loyalty_points,
        ]);

        return response()->json(['data' => $results]);
    }

    public function store(Request $request, CustomerService $customers): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:190'],
        ]);

        $phone = isset($data['phone']) ? $customers->normalizePhone($data['phone']) : null;

        if ($phone) {
            $customer = Customer::query()->updateOrCreate(
                ['phone' => $phone],
                ['name' => $data['name'], 'email' => $data['email'] ?? null],
            );
        } else {
            $customer = Customer::query()->create([
                'name' => $data['name'],
                'phone' => null,
                'email' => $data['email'] ?? null,
            ]);
        }

        return response()->json(['data' => [
            'id' => $customer->id,
            'name' => $customer->name,
            'phone' => $customer->phone,
            'email' => $customer->email,
            'loyalty_points' => $customer->loyalty_points,
        ]], 201);
    }
}
