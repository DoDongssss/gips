<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;

class BackupDatabase extends Command
{
    protected $signature = 'backup:database {--connection= : Database connection name}';

    protected $description = 'Create a timestamped database backup under storage/backups';

    public function handle(): int
    {
        $connection = $this->option('connection') ?: config('database.default');
        $config = config("database.connections.{$connection}");

        if (! is_array($config)) {
            $this->error("Unknown database connection [{$connection}].");

            return self::FAILURE;
        }

        $directory = storage_path('backups');

        if (! File::isDirectory($directory)) {
            File::makeDirectory($directory, 0755, true);
        }

        $timestamp = now()->format('Y-m-d_His');
        $driver = $config['driver'] ?? 'unknown';

        if ($driver === 'sqlite') {
            $source = $config['database'] ?? database_path('database.sqlite');

            if (! is_string($source) || ! File::exists($source)) {
                $this->error('SQLite database file was not found.');

                return self::FAILURE;
            }

            $target = "{$directory}/sqlite-{$timestamp}.sqlite";
            File::copy($source, $target);
            $this->info("SQLite backup saved to {$target}");

            return self::SUCCESS;
        }

        if ($driver === 'mysql') {
            $target = "{$directory}/mysql-{$timestamp}.sql";
            $command = [
                'mysqldump',
                '--host='.($config['host'] ?? '127.0.0.1'),
                '--port='.($config['port'] ?? '3306'),
                '--user='.($config['username'] ?? 'root'),
                '--result-file='.$target,
                $config['database'] ?? '',
            ];

            $env = [];

            if (! empty($config['password'])) {
                $env['MYSQL_PWD'] = $config['password'];
            }

            $process = new Process($command, null, $env);
            $process->run();

            if (! $process->isSuccessful()) {
                $this->error(trim($process->getErrorOutput()) ?: 'mysqldump failed. Is mysqldump installed and on PATH?');

                return self::FAILURE;
            }

            $this->info("MySQL backup saved to {$target}");

            return self::SUCCESS;
        }

        $this->error("Automatic backup is not configured for driver [{$driver}]. See operations/BACKUP.md.");

        return self::FAILURE;
    }
}
