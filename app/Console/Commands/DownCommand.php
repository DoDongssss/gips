<?php

namespace App\Console\Commands;

use Illuminate\Foundation\Console\DownCommand as BaseDownCommand;
use Symfony\Component\Console\Attribute\AsCommand;

#[AsCommand(name: 'down')]
class DownCommand extends BaseDownCommand
{
    /**
     * @return array<string, mixed>
     */
    protected function getDownFilePayload(): array
    {
        if ($this->option('render') === null) {
            $this->input->setOption('render', 'maintenance');
        }

        if ($this->option('retry') === null) {
            $this->input->setOption('retry', '60');
        }

        return parent::getDownFilePayload();
    }
}
