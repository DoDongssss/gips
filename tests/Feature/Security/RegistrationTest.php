<?php

it('has public self-registration switched off', function () {
    $this->get('/register')->assertNotFound();
    $this->post('/register', ['name' => 'Intruder', 'email' => 'x@example.com', 'password' => 'Password123!', 'password_confirmation' => 'Password123!'])->assertNotFound();
});
