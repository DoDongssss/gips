<?php

namespace App\Services;

use App\Models\IdempotencyKey;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Runs a create-style request exactly once per Idempotency-Key.
 *  - first call: runs the callback and stores its response
 *  - retry with the same key and the same payload: returns the stored response
 *  - same key, different payload: rejected
 *  - failed attempts release the key so the client can fix the request and retry
 */
class IdempotencyService
{
    /**
     * @param  array<string, mixed>  $payload  what makes this request unique (route + validated data)
     * @param  callable(): array{0:int, 1:array<string,mixed>}  $callback  returns [status, body]
     * @return array{status:int, body:array<string,mixed>, replayed:bool}
     */
    public function execute(string $key, ?User $user, ?int $deviceId, array $payload, callable $callback): array
    {
        $hash = hash('sha256', json_encode($this->canonical($payload)));

        $record = $this->claim($key, $user, $deviceId, $hash);

        if (is_array($record)) {
            return $record; // replay
        }

        try {
            [$status, $body] = $callback();
            $record->update(['response_status' => $status, 'response_body' => $body, 'locked_at' => null]);

            return ['status' => $status, 'body' => $body, 'replayed' => false];
        } catch (\Throwable $e) {
            $record->delete();
            throw $e;
        }
    }

    /** @return IdempotencyKey|array{status:int, body:array<string,mixed>, replayed:bool} */
    private function claim(string $key, ?User $user, ?int $deviceId, string $hash): IdempotencyKey|array
    {
        try {
            return IdempotencyKey::create([
                'key' => $key,
                'user_id' => $user?->id,
                'device_id' => $deviceId,
                'request_hash' => $hash,
                'locked_at' => now(),
                'expires_at' => now()->addDay(),
            ]);
        } catch (UniqueConstraintViolationException $e) {
            $existing = IdempotencyKey::where('key', $key)->first();

            if (! $existing) {
                throw $e;
            }

            if ($existing->expires_at->isPast()) {
                $existing->delete();

                return $this->claim($key, $user, $deviceId, $hash);
            }

            if (! hash_equals($existing->request_hash, $hash)) {
                throw ValidationException::withMessages([
                    'idempotency_key' => 'This Idempotency-Key was already used for a different request.',
                ]);
            }

            if ($existing->response_status === null) {
                throw new HttpException(409, 'A request with this Idempotency-Key is still being processed.');
            }

            return ['status' => $existing->response_status, 'body' => $existing->response_body ?? [], 'replayed' => true];
        }
    }

    /** Sort keys recursively so the same data always hashes the same. */
    private function canonical(mixed $value): mixed
    {
        if (! is_array($value)) {
            return $value;
        }

        $value = array_map(fn ($v) => $this->canonical($v), $value);
        if (! array_is_list($value)) {
            ksort($value);
        }

        return $value;
    }
}
