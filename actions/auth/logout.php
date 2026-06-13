<?php
declare(strict_types=1);

require_once __DIR__ . '/../../backend/bootstrap.php';

$lang = current_language();

logout_current_user();
redirect_to(app_url('login_url') . '?lang=' . urlencode($lang));
