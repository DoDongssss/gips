<?php

namespace App\Http\Controllers;

use App\Http\Requests\TaxRequest;
use App\Models\Tax;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/** Tax rates used to price orders. Exactly one active tax is the default. */
class TaxController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:setting.view', only: ['index']),
            new Middleware('permission:setting.update', only: ['store', 'update']),
        ];
    }

    public function index(): Response
    {
        return Inertia::render('taxes/index', [
            'taxes' => Tax::query()
                ->orderByDesc('is_default')
                ->orderByDesc('is_active')
                ->orderBy('name')
                ->get()
                ->map(fn (Tax $tax) => [
                    'id' => $tax->id,
                    'name' => $tax->name,
                    'rate_percent' => (float) $tax->rate * 100,
                    'is_inclusive' => $tax->is_inclusive,
                    'is_default' => $tax->is_default,
                    'is_active' => $tax->is_active,
                ]),
        ]);
    }

    public function store(TaxRequest $request): RedirectResponse
    {
        $tax = $this->save(new Tax, $request);

        return back()->with('success', "Tax \"{$tax->name}\" created.");
    }

    public function update(TaxRequest $request, Tax $tax): RedirectResponse
    {
        $tax = $this->save($tax, $request);

        return back()->with('success', "Tax \"{$tax->name}\" saved.");
    }

    private function save(Tax $tax, TaxRequest $request): Tax
    {
        $data = $request->validated();

        return DB::transaction(function () use ($tax, $data) {
            if ($data['is_default']) {
                Tax::where('is_default', true)->where('id', '!=', $tax->id ?? 0)->update(['is_default' => false]);
            }

            $tax->fill([
                'name' => $data['name'],
                'rate' => round($data['rate_percent'] / 100, 4),
                'is_inclusive' => $data['is_inclusive'],
                'is_default' => $data['is_default'],
                'is_active' => $data['is_active'],
            ])->save();

            return $tax;
        });
    }
}
