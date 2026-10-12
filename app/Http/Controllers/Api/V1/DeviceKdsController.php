<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Middleware\EnsureKitchenDevice;
use App\Models\Device;
use App\Models\KdsTicket;
use App\Models\KdsTicketItem;
use App\Services\Kitchen\KdsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/** The same board as the staff screen, but a device only ever sees and changes its own station. */
class DeviceKdsController extends Controller implements HasMiddleware
{
    public function __construct(private KdsService $kds) {}

    public static function middleware(): array
    {
        return [new Middleware(EnsureKitchenDevice::class)];
    }

    public function tickets(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->kds->board($this->device($request)->station)]);
    }

    public function start(KdsTicket $ticket, Request $request): JsonResponse
    {
        $device = $this->device($request);
        $this->ownTicket($device, $ticket);

        return $this->respond($this->kds->start($ticket, $device));
    }

    public function bumpTicket(KdsTicket $ticket, Request $request): JsonResponse
    {
        $device = $this->device($request);
        $this->ownTicket($device, $ticket);

        return $this->respond($this->kds->bumpTicket($ticket, $device));
    }

    public function bumpItem(KdsTicketItem $item, Request $request): JsonResponse
    {
        $device = $this->device($request);
        $this->ownTicket($device, $item->ticket);

        return $this->respond($this->kds->bumpItem($item, $device));
    }

    public function recall(Request $request): JsonResponse
    {
        $device = $this->device($request);

        return $this->respond($this->kds->recall($device->station, $device));
    }

    private function device(Request $request): Device
    {
        /** @var Device */
        return $request->user();
    }

    private function ownTicket(Device $device, KdsTicket $ticket): void
    {
        abort_unless($ticket->station_id === $device->station_id, 403, 'That ticket belongs to another station.');
    }

    private function respond(KdsTicket $ticket): JsonResponse
    {
        return response()->json(['data' => $this->kds->present($ticket)]);
    }
}
