<?php
declare(strict_types=1);

require_once __DIR__ . '/database.php';

$email = 'demo@falles360.local';
$password = 'falles123';
$name = 'Demo Fallero';

$statement = db()->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
$statement->execute(['email' => $email]);
$existing = $statement->fetch();

if ($existing) {
    echo "Demo user already exists.\n";
    exit(0);
}

$insert = db()->prepare(
    'INSERT INTO users (name, email, password, role, status)
     VALUES (:name, :email, :password, :role, :status)'
);

$insert->execute([
    'name' => $name,
    'email' => $email,
    'password' => password_hash($password, PASSWORD_DEFAULT),
    'role' => 'user',
    'status' => 'active',
]);

echo "Demo user created.\n";
