<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/bootstrap.php';

function fallerito_event_string(mixed $value, int $maxLength = 160): string
{
    $text = trim((string) $value);
    $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
    return mb_substr($text, 0, $maxLength, 'UTF-8');
}

function fallerito_event_user_id(array $user): ?int
{
    $userId = isset($user['id']) ? (int) $user['id'] : 0;
    return $userId > 0 ? $userId : null;
}

function fallerito_event_log(array $user, string $actionType, array $details = []): void
{
    $payload = [
        'threadId' => fallerito_event_string($details['threadId'] ?? '', 80),
        'label' => fallerito_event_string($details['label'] ?? '', 120),
        'prompt' => fallerito_event_string($details['prompt'] ?? '', 160),
        'intent' => fallerito_event_string($details['intent'] ?? $details['sourceIntent'] ?? '', 60),
        'actionType' => fallerito_event_string($details['actionType'] ?? '', 60),
        'tab' => fallerito_event_string($details['tab'] ?? '', 40),
        'fallaId' => isset($details['fallaId']) ? (int) $details['fallaId'] : null,
        'replyPreview' => fallerito_event_string($details['replyPreview'] ?? '', 220),
    ];

    $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    write_access_log(
        fallerito_event_user_id($user),
        $actionType,
        'fallerito',
        $payload['fallaId'] !== null && $payload['fallaId'] > 0 ? $payload['fallaId'] : null,
        is_string($encoded) ? $encoded : null
    );
}

try {
    app_require_method('POST');
    $user = api_registered_user_or_error('Necesitas una cuenta registrada para usar Fallerito.');
    app_require_json_content_type();
    csrf_assert_valid();

    rate_limit_api_enforce('api_fallerito_event', [
        ['scope' => 'user', 'max' => 120, 'window' => 300],
        ['scope' => 'session', 'max' => 120, 'window' => 300],
    ], app_rate_limit_context($user));

    $payload = app_validate_payload_keys(app_request_json_payload(4096), ['eventType', 'threadId', 'details'], true);
    $eventType = app_validate_enum((string) ($payload['eventType'] ?? ''), 'eventType', [
        'action_click',
        'followup_click',
        'feedback_up',
        'feedback_down',
        'copy_reply',
        'read_reply',
        'mode_select',
    ]);
    $details = isset($payload['details']) && is_array($payload['details']) ? $payload['details'] : [];
    $details['threadId'] = $payload['threadId'] ?? ($details['threadId'] ?? '');

    fallerito_event_log($user, 'fallerito_' . $eventType, $details);

    app_json_response([
        'ok' => true,
    ]);
} catch (InvalidArgumentException $exception) {
    app_json_error($exception->getMessage(), 422);
} catch (Throwable $exception) {
    app_json_error('No se pudo registrar el evento de Fallerito.', 500);
}
