<?php

namespace App\Http\Controllers\Concerns;

use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;

trait ReportsDomainErrors
{
    /**
     * Run a service call. A DomainException (a business rule said no) becomes a form error
     * the page can show; anything else is a real bug and is left to throw.
     */
    protected function attempt(callable $action, string $success): RedirectResponse
    {
        try {
            $action();
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['error' => $e->getMessage()]);
        }

        return back()->with('success', $success);
    }
}
