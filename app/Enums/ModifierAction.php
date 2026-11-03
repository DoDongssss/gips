<?php

namespace App\Enums;

enum ModifierAction: string
{
    case Add = 'add';
    case Remove = 'remove';
    case Replace = 'replace';
}
