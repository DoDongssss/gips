<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\KdsTicket;
use App\Models\KdsTicketItem;
use App\Models\Station;
use App\Services\Kitchen\KdsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/** JSON for the kitchen screens a signed-in staff member opens: tickets per station, plus start, bump and recall. */
class KdsController extends Controller implements HasMiddleware
{
    public function __construct(private KdsService $kds) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:kds.view', only: ['stations', 'tickets']),
            new Middleware('permission:kds.bump', only: ['start', 'bumpItem', 'bumpTicket', 'recall']),
        ];
    }

    public function stations(): JsonResponse
    {
        $open = ['new', 'preparing', 'ready'];

        return response()->json(['data' => Station::active()->ordered()->get()->map(fn (Station $s) => [
            'id' => $s->id,
            'name' => $s->name,
            'slug' => $s->slug,
            'type' => $s->type->value,
            'open_tickets' => $s->tickets()->whereIn('status', $open)->count(),
        ])->values()]);
    }

    public function tickets(Station $station): JsonResponse
    {
        return response()->json(['data' => $this->kds->board($station)]);
    }

    public function start(KdsTicket $ticket, Request $request): JsonResponse
    {
        return $this->respond($this->kds->start($ticket, $request->user()));
    }

    public function bumpItem(KdsTicketItem $item, Request $request): JsonResponse
    {
        return $this->respond($this->kds->bumpItem($item, $request->user()));
    }

    public function bumpTicket(KdsTicket $ticket, Request $request): JsonResponse
    {
        return $this->respond($this->kds->bumpTicket($ticket, $request->user()));
    }

    public function recall(Station $station, Request $request): JsonResponse
    {
        return $this->respond($this->kds->recall($station, $request->user()));
    }

    private function respond(KdsTicket $ticket): JsonResponse
    {
        return response()->json(['data' => $this->kds->present($ticket)]);
    }
}
