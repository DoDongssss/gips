<?php

namespace App\Notifications;

use App\Models\Ingredient;
use Illuminate\Notifications\Notification;

class LowStockNotification extends Notification
{
    public function __construct(
        public readonly Ingredient $ingredient,
        public readonly string $quantity,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'kind' => 'low_stock',
            'ingredient_id' => $this->ingredient->id,
            'ingredient' => $this->ingredient->name,
            'quantity' => $this->quantity,
            'reorder_level' => (string) $this->ingredient->reorder_level,
            'unit' => $this->ingredient->baseUnit?->abbreviation,
            'message' => "{$this->ingredient->name} is low: {$this->quantity} left.",
        ];
    }
}
