<?php

namespace App\Http\Controllers\Customers;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customers\AdjustCustomerLoyaltyRequest;
use App\Http\Requests\Customers\CustomerRequest;
use App\Models\Customer;
use App\Models\Order;
use App\Services\Customers\LoyaltyService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:customer.view', only: ['index', 'show']),
            new Middleware('permission:customer.manage', only: ['update', 'adjustLoyalty']),
        ];
    }

    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $hasOrders = $request->query('has_orders');
        $loyalty = $request->query('loyalty');

        $sortable = ['name', 'phone', 'email', 'loyalty_points', 'orders_count', 'created_at'];
        $sort = in_array($request->query('sort'), $sortable, true) ? $request->query('sort') : null;
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';

        return Inertia::render('customers/index', [
            'customers' => Inertia::optional(fn () => Customer::query()
                ->when($search !== '', function ($query) use ($search) {
                    $query->where(function ($builder) use ($search) {
                        $builder->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
                })
                ->when($hasOrders === 'yes', fn ($query) => $query->has('orders'))
                ->when($hasOrders === 'no', fn ($query) => $query->doesntHave('orders'))
                ->when($loyalty === 'with_points', fn ($query) => $query->where('loyalty_points', '>', 0))
                ->withCount('orders')
                ->when($sort === 'orders_count', fn ($query) => $query->orderBy('orders_count', $direction))
                ->when(
                    in_array($sort, ['name', 'phone', 'email', 'loyalty_points', 'created_at'], true),
                    fn ($query) => $query->orderBy($sort, $direction),
                )
                ->when($sort === null, fn ($query) => $query->orderByDesc('loyalty_points')->orderBy('name'))
                ->when($sort !== null && $sort !== 'name', fn ($query) => $query->orderBy('name'))
                ->orderBy('id')
                ->paginate(20)
                ->withQueryString()
                ->through(fn (Customer $customer) => $this->presentListRow($customer))
            ),
            'filters' => [
                'search' => $search,
                'has_orders' => in_array($hasOrders, ['yes', 'no'], true) ? $hasOrders : null,
                'loyalty' => $loyalty === 'with_points' ? $loyalty : null,
                'sort' => $sort,
                'direction' => $sort ? $direction : null,
            ],
        ]);
    }

    public function show(Customer $customer): Response
    {
        $customer->loadCount('orders');

        return Inertia::render('customers/show', [
            'customer' => $this->presentDetail($customer),
            'orders' => $customer->orders()
                ->latest('id')
                ->limit(30)
                ->get(['id', 'order_number', 'business_date', 'total_cents', 'payment_status', 'loyalty_points_redeemed', 'loyalty_points_awarded'])
                ->map(fn (Order $order) => [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'business_date' => $order->business_date?->toDateString(),
                    'total_cents' => $order->total_cents,
                    'payment_status' => $order->payment_status->value,
                    'loyalty_points_redeemed' => $order->loyalty_points_redeemed,
                    'loyalty_points_awarded' => $order->loyalty_points_awarded,
                ])
                ->values(),
            'ledger' => $customer->loyaltyTransactions()
                ->with('order:id,order_number', 'user:id,name')
                ->limit(50)
                ->get()
                ->map(fn ($row) => [
                    'id' => $row->id,
                    'type' => $row->type->value,
                    'points' => $row->points,
                    'balance_after' => $row->balance_after,
                    'note' => $row->note,
                    'order_number' => $row->order?->order_number,
                    'user_name' => $row->user?->name,
                    'created_at' => $row->created_at?->toIso8601String(),
                ])
                ->values(),
        ]);
    }

    public function update(CustomerRequest $request, Customer $customer): RedirectResponse
    {
        $customer->update($request->validated());

        return back()->with('success', "{$customer->name} was updated.");
    }

    public function adjustLoyalty(AdjustCustomerLoyaltyRequest $request, Customer $customer, LoyaltyService $loyalty): RedirectResponse
    {
        $data = $request->validated();

        $loyalty->adjustBalance($customer, (int) $data['points'], $request->user(), $data['note']);

        return back()->with('success', 'Loyalty balance was updated.');
    }

    private function presentListRow(Customer $customer): array
    {
        return [
            'id' => $customer->id,
            'name' => $customer->name,
            'phone' => $customer->phone,
            'email' => $customer->email,
            'loyalty_points' => $customer->loyalty_points,
            'orders_count' => $customer->orders_count,
            'created_at' => $customer->created_at?->toIso8601String(),
        ];
    }

    private function presentDetail(Customer $customer): array
    {
        return [
            'id' => $customer->id,
            'name' => $customer->name,
            'phone' => $customer->phone,
            'email' => $customer->email,
            'notes' => $customer->notes,
            'loyalty_points' => $customer->loyalty_points,
            'orders_count' => $customer->orders_count,
            'created_at' => $customer->created_at?->toIso8601String(),
        ];
    }
}
