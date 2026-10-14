<?php

namespace App\Http\Controllers;

use App\Http\Requests\Configurations\UpdateConfigurationRequest;
use App\Services\ConfigurationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

class ConfigurationController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:setting.view', only: ['index']),
            new Middleware('permission:setting.update', only: ['update']),
        ];
    }

    public function index(ConfigurationService $configuration): Response
    {
        $values = $configuration->all();

        $groups = collect(config('configurations.groups'))
            ->map(fn (array $group, string $key) => [
                'key' => $key,
                'label' => $group['label'],
                'description' => $group['description'] ?? null,
                'fields' => collect($group['fields'])
                    ->map(fn (array $field, string $name) => [
                        'name' => $name,
                        'label' => $field['label'],
                        'type' => $field['type'],
                        'help' => $field['help'] ?? null,
                        'min' => $field['min'] ?? null,
                        'max' => $field['max'] ?? null,
                        'step' => $field['step'] ?? null,
                        'value' => $values[$name] ?? null,
                    ])
                    ->values()
                    ->all(),
            ])
            ->values()
            ->all();

        return Inertia::render('configurations/index', [
            'groups' => $groups,
        ]);
    }

    public function update(UpdateConfigurationRequest $request, string $group, ConfigurationService $configuration): RedirectResponse
    {
        $configuration->update($group, $request->validated(), $request->user());

        $label = config("configurations.groups.{$group}.label");

        return back()->with('success', "{$label} configuration saved.");
    }
}