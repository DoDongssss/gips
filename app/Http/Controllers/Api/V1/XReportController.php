<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Shift;
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
     *  - scope "shift": an open shift (yours, or shift_id with shift.view-all)
     *  - scope "day": every sale of the current business day (needs report.view)
     */
    public function __invoke(Request $request, ReportService $reports, ShiftService $shifts): JsonResponse
    {
        $data = $request->validate([
            'scope' => ['required', Rule::in(['shift', 'day'])],
            'shift_id' => ['nullable', 'integer', 'exists:shifts,id'],
        ]);

        $scope = $data['scope'];
        $user = $request->user();

        if ($scope === 'day') {
            abort_unless($user->can('report.view'), 403);

            return response()->json(['data' => $reports->makeXReport($user)]);
        }

        abort_unless($user->can('shift.open') || $user->can('shift.view-all'), 403);

        $shift = isset($data['shift_id'])
            ? Shift::query()->with('user')->findOrFail($data['shift_id'])
            : $shifts->current($user);

        if ($shift === null) {
            throw ValidationException::withMessages(['scope' => 'You have no open shift.']);
        }

        if ($shift->user_id !== $user->id) {
            abort_unless($user->can('shift.view-all'), 403);
        }

        if (! $shift->isOpen()) {
            throw ValidationException::withMessages(['shift_id' => 'That shift is not open.']);
        }

        return response()->json(['data' => $reports->makeXReport($user, $shift)]);
    }
}
