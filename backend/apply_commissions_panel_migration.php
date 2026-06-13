<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$sqlFile = __DIR__ . '/../database/fallas360_commissions_panel.sql';
if (!is_file($sqlFile)) {
    http_response_code(500);
    echo 'No se encuentra la migracion SQL.';
    exit;
}

$sql = (string) file_get_contents($sqlFile);
$statements = array_filter(array_map('trim', preg_split('/;\s*\R/', $sql) ?: []));
$executed = 0;
$errors = [];

foreach ($statements as $statement) {
    if ($statement === '' || str_starts_with($statement, '--')) {
        continue;
    }

    try {
        db()->exec($statement);
        $executed++;
    } catch (Throwable $exception) {
        $errors[] = $exception->getMessage();
    }
}

header('Content-Type: text/plain; charset=utf-8');
echo "Migracion panel comisiones Fallas 360\n";
echo "Sentencias ejecutadas: {$executed}\n";
if ($errors !== []) {
    echo "Avisos/errores no bloqueantes:\n";
    foreach ($errors as $error) {
        echo '- ' . $error . "\n";
    }
}
echo "\nPanel: ../panel/index.php\n";
