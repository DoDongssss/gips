<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Reports\ReportService;
use App\Services\Shifts\ShiftService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class XReportController extends Controller
{
    /**
     * POST /api/v1/reports/x: a mid-day snapshot that resets nothing.
     *  - scope "shift": the signed-in person's open shift (needs shift.open)
     *  - scope "day": every sale of the current business day (needs report.view)
     */
    public function __invoke(Request $request, ReportService $reports, ShiftService $shifts): JsonResponse
    {
        $scope = $request->validate([
            'scope' => ['required', Rule::in(['shift', 'day'])],
        ])['scope'];
        $user = $request->user();

        if ($scope === 'day') {
            abort_unless($user->can('report.view'), 403);

            return response()->json(['data' => $reports->makeXReport($user)]);
        }

        abort_unless($user->can('shift.open'), 403);

        $shift = $shifts->current($user);
        if (! $shift) {
            throw ValidationException::withMessages(['scope' => 'You have no open shift.']);
        }

        return response()->json(['data' => $reports->makeXReport($user, $shift->load('user'))]);
    }
}
