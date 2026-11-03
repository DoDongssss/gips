<?php

namespace App\Http\Controllers\Kiosk;

use App\Http\Controllers\Controller;
use App\Http\Requests\Kiosk\ScreenRequest;
use App\Models\KioskScreen;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/** Welcome screens and promo banners shown on the kiosk's idle screen. */
class ScreenController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:device.manage')];
    }

    public function index(): Response
    {
        return Inertia::render('kiosk/screens/index', [
            'screens' => KioskScreen::query()->orderBy('sort_order')->orderBy('id')->get()->map(fn (KioskScreen $s) => [
                'id' => $s->id, 'title' => $s->title, 'type' => $s->type, 'image_url' => $s->imageUrl(),
                'headline' => $s->content['headline'] ?? null, 'subtext' => $s->content['subtext'] ?? null,
                'sort_order' => $s->sort_order, 'starts_at' => $s->starts_at?->format('Y-m-d\TH:i'), 'ends_at' => $s->ends_at?->format('Y-m-d\TH:i'),
                'is_active' => $s->is_active,
                'showing' => $s->is_active && ($s->starts_at === null || $s->starts_at->lte(now())) && ($s->ends_at === null || $s->ends_at->gte(now())),
            ]),
        ]);
    }

    public function store(ScreenRequest $request): RedirectResponse
    {
        KioskScreen::create($this->fields($request));

        return back()->with('success', 'Screen added.');
    }

    public function update(ScreenRequest $request, KioskScreen $screen): RedirectResponse
    {
        $fields = $this->fields($request, $screen);
        $screen->update($fields);

        return back()->with('success', 'Screen saved.');
    }

    public function destroy(KioskScreen $screen): RedirectResponse
    {
        $this->deleteImage($screen);
        $screen->delete();

        return back()->with('success', 'Screen deleted.');
    }

    /** @return array<string, mixed> */
    private function fields(ScreenRequest $request, ?KioskScreen $screen = null): array
    {
        $data = $request->validated();

        $fields = [
            'title' => $data['title'], 'type' => $data['type'], 'sort_order' => $data['sort_order'],
            'starts_at' => $data['starts_at'] ?? null, 'ends_at' => $data['ends_at'] ?? null, 'is_active' => $data['is_active'],
            'content' => array_filter(['headline' => $data['headline'] ?? null, 'subtext' => $data['subtext'] ?? null], fn ($v) => filled($v)) ?: null,
        ];

        if ($request->hasFile('image')) {
            $screen && $this->deleteImage($screen);
            $fields['image_path'] = $request->file('image')->store('kiosk/screens', 'public');
        } elseif ($screen && ($data['remove_image'] ?? false)) {
            $this->deleteImage($screen);
            $fields['image_path'] = null;
        }

        return $fields;
    }

    private function deleteImage(KioskScreen $screen): void
    {
        if ($screen->image_path) {
            Storage::disk('public')->delete($screen->image_path);
        }
    }
}
