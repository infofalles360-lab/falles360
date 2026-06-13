<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/security.php';
require_once __DIR__ . '/validation.php';
require_once __DIR__ . '/csrf.php';
require_once __DIR__ . '/rate_limit.php';
require_once __DIR__ . '/session.php';

app_start_session();
app_apply_security_headers();
require_once __DIR__ . '/i18n.php';
set_current_language_from_request();
require_once __DIR__ . '/auth.php';
app_bootstrap_authenticated_session();
csrf_issue_cookie();
app_run_security_housekeeping();
