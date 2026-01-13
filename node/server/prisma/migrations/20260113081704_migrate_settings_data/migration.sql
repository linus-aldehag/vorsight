-- Migration to update legacy settings to new MachineSettings structure

-- Update machine_state table, ensuring we don't double-migrate
UPDATE machine_state
SET settings = json_object(
    'network', json_object(
        'pingIntervalSeconds', COALESCE(json_extract(settings, '$.pingIntervalSeconds'), 300)
    ),
    'screenshots', json_object(
        'enabled', CASE WHEN json_extract(settings, '$.screenshotIntervalSeconds') > 0 THEN true ELSE false END,
        'intervalSeconds', COALESCE(json_extract(settings, '$.screenshotIntervalSeconds'), 300),
        'filterDuplicates', true
    ),
    'activity', json_object(
        'enabled', CASE WHEN json_extract(settings, '$.isMonitoringEnabled') = 1 OR json_extract(settings, '$.isMonitoringEnabled') = 'true' THEN true ELSE false END,
        'intervalSeconds', 10
    ),
    'audit', json_object(
        'enabled', CASE WHEN json_extract(settings, '$.isAuditEnabled') = 1 OR json_extract(settings, '$.isAuditEnabled') = 'true' THEN true ELSE false END,
        'filters', json_object(
            'security', true,
            'system', true,
            'application', true
        )
    ),
    'accessControl', json_object(
        'enabled', CASE WHEN json_extract(settings, '$.isAccessControlEnabled') = 1 OR json_extract(settings, '$.isAccessControlEnabled') = 'true' THEN true ELSE false END,
        'violationAction', 'logoff',
        'schedule', json(COALESCE(json_extract(settings, '$.schedule'), '[]'))
    )
)
WHERE json_extract(settings, '$.monitoring') IS NULL;