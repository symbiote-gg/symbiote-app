UPDATE "replays_players" SET "score" = (
	SELECT json_group_object("key", "value") FROM json_each("score")
	WHERE "key" IN ('SoloKill', 'Deaths', 'Assists', 'Takedowns', 'HeroDamage',
		'SiegeDamage', 'Healing', 'SelfHealing', 'DamageTaken', 'ExperienceContribution')
);
