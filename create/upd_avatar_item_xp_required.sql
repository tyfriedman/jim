-- Updates xp_required (used as coin cost) and image_url for existing avatar items.
-- This script does not modify name, item_type, or unlock_condition.

UPDATE AVATAR_ITEM
SET xp_required = CASE
  WHEN unlock_condition = 'bandana' OR LOWER(name) = 'bandana' THEN 30
  WHEN unlock_condition = 'hat1' OR LOWER(name) = 'hat 1' THEN 20
  WHEN unlock_condition = 'hat2' OR LOWER(name) = 'hat 2' THEN 20
  WHEN unlock_condition = 'hat3' OR LOWER(name) = 'hat 3' THEN 50
  WHEN unlock_condition = 'hair1' OR LOWER(name) = 'hair 1' THEN 30
  WHEN unlock_condition = 'hair2' OR LOWER(name) = 'hair 2' THEN 100
  WHEN unlock_condition = 'blackglasses' OR LOWER(name) = 'black glasses' THEN 100
  WHEN unlock_condition = 'eyepatch' OR LOWER(name) = 'eye patch' THEN 50
  WHEN unlock_condition = 'eyes1' OR LOWER(name) = 'eyes 1' THEN 20
  WHEN unlock_condition = 'eyes2' OR LOWER(name) = 'eyes 2' THEN 40
  WHEN unlock_condition = 'eyes3' OR LOWER(name) = 'eyes 3' THEN 50
  WHEN unlock_condition = 'monocle' OR LOWER(name) = 'monocle' THEN 100
  WHEN unlock_condition = 'cig' OR LOWER(name) = 'cig' THEN 100
  WHEN unlock_condition = 'clownnose' OR LOWER(name) = 'clown nose' THEN 100
  WHEN unlock_condition = 'crookedteeth' OR LOWER(name) = 'crooked teeth' THEN 20
  WHEN unlock_condition = 'mustache' OR LOWER(name) = 'mustache' THEN 50
  WHEN unlock_condition = 'tongue' OR LOWER(name) = 'tongue' THEN 30
  WHEN unlock_condition = 'yellow' OR LOWER(name) = 'yellow body' THEN 50
  WHEN unlock_condition = 'turquoise' OR LOWER(name) = 'turquoise body' THEN 50
  WHEN unlock_condition = 'purple' OR LOWER(name) = 'purple body' THEN 50
  ELSE xp_required
END,
image_url = CASE
  WHEN unlock_condition = 'bandana' OR LOWER(name) = 'bandana' THEN '/sprites/purchases/Hat-hair/Bandana%20128x128px.png'
  WHEN unlock_condition = 'hat1' OR LOWER(name) = 'hat 1' THEN '/sprites/purchases/Hat-hair/Hat1%20128x128px.png'
  WHEN unlock_condition = 'hat2' OR LOWER(name) = 'hat 2' THEN '/sprites/purchases/Hat-hair/Hat2%20128x128px.png'
  WHEN unlock_condition = 'hat3' OR LOWER(name) = 'hat 3' THEN '/sprites/purchases/Hat-hair/Hat3%20128x128px.png'
  WHEN unlock_condition = 'hair1' OR LOWER(name) = 'hair 1' THEN '/sprites/purchases/Hat-hair/hair1%20128x128px.png'
  WHEN unlock_condition = 'hair2' OR LOWER(name) = 'hair 2' THEN '/sprites/purchases/Hat-hair/hair2%20128x128px.png'
  WHEN unlock_condition = 'blackglasses' OR LOWER(name) = 'black glasses' THEN '/sprites/purchases/Eyes-glasses/Black%20glasses%20128x128px.png'
  WHEN unlock_condition = 'eyepatch' OR LOWER(name) = 'eye patch' THEN '/sprites/purchases/Eyes-glasses/Eye%20patch%20128x128px.png'
  WHEN unlock_condition = 'eyes1' OR LOWER(name) = 'eyes 1' THEN '/sprites/purchases/Eyes-glasses/Eyes1%20128x128px.png'
  WHEN unlock_condition = 'eyes2' OR LOWER(name) = 'eyes 2' THEN '/sprites/purchases/Eyes-glasses/Eyes2%20128x128px.png'
  WHEN unlock_condition = 'eyes3' OR LOWER(name) = 'eyes 3' THEN '/sprites/purchases/Eyes-glasses/Eyes3%20128x128px.png'
  WHEN unlock_condition = 'monocle' OR LOWER(name) = 'monocle' THEN '/sprites/purchases/Eyes-glasses/Monocle%20128x128px.png'
  WHEN unlock_condition = 'cig' OR LOWER(name) = 'cig' THEN '/sprites/purchases/Beard-mouth/Cig%20128x128px.png'
  WHEN unlock_condition = 'clownnose' OR LOWER(name) = 'clown nose' THEN '/sprites/purchases/Beard-mouth/Clown%20nose%20128x128px.png'
  WHEN unlock_condition = 'crookedteeth' OR LOWER(name) = 'crooked teeth' THEN '/sprites/purchases/Beard-mouth/Crooked%20teeth%20128x128px.png'
  WHEN unlock_condition = 'mustache' OR LOWER(name) = 'mustache' THEN '/sprites/purchases/Beard-mouth/Mustache%20128x128px.png'
  WHEN unlock_condition = 'tongue' OR LOWER(name) = 'tongue' THEN '/sprites/purchases/Beard-mouth/Tongue%20128x128px.png'
  WHEN unlock_condition = 'yellow' OR LOWER(name) = 'yellow body' THEN '/sprites/purchases/Body/Yellow%20128x128px.png'
  WHEN unlock_condition = 'turquoise' OR LOWER(name) = 'turquoise body' THEN '/sprites/purchases/Body/Turquoise%20128x128px.png'
  WHEN unlock_condition = 'purple' OR LOWER(name) = 'purple body' THEN '/sprites/purchases/Body/Purple%20128x128px.png'
  ELSE image_url
END
WHERE unlock_condition IN (
  'bandana','hat1','hat2','hat3','hair1','hair2',
  'blackglasses','eyepatch','eyes1','eyes2','eyes3','monocle',
  'cig','clownnose','crookedteeth','mustache','tongue',
  'yellow','turquoise','purple'
)
OR LOWER(name) IN (
  'bandana','hat 1','hat 2','hat 3','hair 1','hair 2',
  'black glasses','eye patch','eyes 1','eyes 2','eyes 3','monocle',
  'cig','clown nose','crooked teeth','mustache','tongue',
  'yellow body','turquoise body','purple body'
);

COMMIT;

-- Optional verification:
-- SELECT unlock_condition, name, xp_required, image_url
-- FROM AVATAR_ITEM
-- WHERE unlock_condition IN (
--   'bandana','hat1','hat2','hat3','hair1','hair2',
--   'blackglasses','eyepatch','eyes1','eyes2','eyes3','monocle',
--   'cig','clownnose','crookedteeth','mustache','tongue',
--   'yellow','turquoise','purple'
-- )
-- OR LOWER(name) IN (
--   'bandana','hat 1','hat 2','hat 3','hair 1','hair 2',
--   'black glasses','eye patch','eyes 1','eyes 2','eyes 3','monocle',
--   'cig','clown nose','crooked teeth','mustache','tongue',
--   'yellow body','turquoise body','purple body'
-- )
-- ORDER BY 1, 2;

EXIT;
