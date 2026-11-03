<?php

use Illuminate\Support\Facades\RateLimiter;

it('limits password reset requests per visitor', function () {
    RateLimiter::clear('sensitive:forgot-password|127.0.0.1');

    foreach (range(1, 5) as $i) {
        $this->post('/forgot-password', ['email' => "nobody{$i}@example.com"])->assertStatus(302);
    }

    $this->post('/forgot-password', ['email' => 'nobody6@example.com'])->assertStatus(429);
});
