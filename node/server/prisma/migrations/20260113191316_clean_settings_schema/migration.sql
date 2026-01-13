-- Migration to clean up settings JSON structure and enforce types

UPDATE machine_state
SET settings = json_object(
    'network', json_object(
        'pingIntervalSeconds', COALESCE(json_extract(settings, '$.network.pingIntervalSeconds'), 300)
    ),
    'screenshots', json_object(
        'enabled', CASE WHEN json_extract(settings, '$.screenshots.enabled') THEN json('true') ELSE json('false') END,
        'intervalSeconds', COALESCE(json_extract(settings, '$.screenshots.intervalSeconds'), 300),
        'filterDuplicates', CASE WHEN json_extract(settings, '$.screenshots.filterDuplicates') THEN json('true') ELSE json('false') END
    ),
    'activity', json_object(
        'enabled', CASE WHEN json_extract(settings, '$.activity.enabled') THEN json('true') ELSE json('false') END,
        'intervalSeconds', COALESCE(json_extract(settings, '$.activity.intervalSeconds'), 10)
    ),
    'audit', json_object(
        'enabled', CASE WHEN json_extract(settings, '$.audit.enabled') THEN json('true') ELSE json('false') END,
        'filters', json_object(
            'security', CASE WHEN json_extract(settings, '$.audit.filters.security') THEN json('true') ELSE json('false') END,
            'system', CASE WHEN json_extract(settings, '$.audit.filters.system') THEN json('true') ELSE json('false') END,
            'application', CASE WHEN json_extract(settings, '$.audit.filters.application') THEN json('true') ELSE json('false') END
        )
    ),
    'accessControl', json_object(
        'enabled', CASE WHEN json_extract(settings, '$.accessControl.enabled') THEN json('true') ELSE json('false') END,
        'violationAction', COALESCE(json_extract(settings, '$.accessControl.violationAction'), 'logoff'),
        'schedule', CASE
            WHEN json_type(settings, '$.accessControl.schedule') = 'array' THEN
                (
                    SELECT json_group_array(json_object(
                        'dayOfWeek', json_extract(value, '$.dayOfWeek'),
                        'startTime', json_extract(value, '$.startTime'),
                        'endTime', json_extract(value, '$.endTime')
                    ))
                    FROM json_each(json_extract(settings, '$.accessControl.schedule'))
                )
            WHEN json_type(settings, '$.accessControl.schedule') = 'object' THEN
                 (
                    SELECT json_group_array(json_object(
                        'dayOfWeek', json_extract(value, '$.dayOfWeek'),
                        'startTime', json_extract(value, '$.startTime'),
                        'endTime', json_extract(value, '$.endTime')
                    ))
                    FROM json_each(json_extract(settings, '$.accessControl.schedule.allowedTimeWindows'))
                 )
            ELSE json('[]')
        END
    )
)
WHERE settings IS NOT NULL;