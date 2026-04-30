-- ============================================================
-- Seed: EXERCISE_CATEGORY + EXERCISE
-- ============================================================

INSERT INTO EXERCISE_CATEGORY (name)
WITH categories(name) AS (
    SELECT 'Biceps' FROM dual
    UNION ALL SELECT 'Triceps' FROM dual
    UNION ALL SELECT 'Shoulders' FROM dual
    UNION ALL SELECT 'Back' FROM dual
    UNION ALL SELECT 'Chest' FROM dual
    UNION ALL SELECT 'Legs' FROM dual
    UNION ALL SELECT 'Abs' FROM dual
    UNION ALL SELECT 'Cardio' FROM dual
)
SELECT c.name
FROM categories c
WHERE NOT EXISTS (
    SELECT 1
    FROM EXERCISE_CATEGORY ec
    WHERE ec.name = c.name
);

-- ============================================================
-- Biceps
-- ============================================================
INSERT INTO EXERCISE (category_id, name, description)
WITH exercises(name) AS (
    SELECT 'Barbell Curl' FROM dual
    UNION ALL SELECT 'Hammer Curl' FROM dual
    UNION ALL SELECT 'Preacher Curl' FROM dual
    UNION ALL SELECT 'Incline Dumbbell Curl' FROM dual
    UNION ALL SELECT 'Cable Curl' FROM dual
    UNION ALL SELECT 'Concentration Curl' FROM dual
    UNION ALL SELECT 'EZ-Bar Curl' FROM dual
    UNION ALL SELECT 'Reverse Curl' FROM dual
    UNION ALL SELECT 'Spider Curl' FROM dual
    UNION ALL SELECT 'Machine Bicep Curl' FROM dual
    UNION ALL SELECT 'Bayesian Cable Curl' FROM dual
    UNION ALL SELECT 'High Cable Curl' FROM dual
    UNION ALL SELECT 'Cross-Body Hammer Curl' FROM dual
    UNION ALL SELECT 'Zottman Curl' FROM dual
    UNION ALL SELECT 'Drag Curl' FROM dual
    UNION ALL SELECT 'Alternating Dumbbell Curl' FROM dual
    UNION ALL SELECT 'Seated Incline Curl' FROM dual
    UNION ALL SELECT 'Scott Curl' FROM dual
    UNION ALL SELECT 'Rope Hammer Curl' FROM dual
    UNION ALL SELECT 'Single-Arm Cable Curl' FROM dual
)
SELECT c.category_id, e.name, ''
FROM EXERCISE_CATEGORY c
CROSS JOIN exercises e
WHERE c.name = 'Biceps'
  AND NOT EXISTS (
      SELECT 1
      FROM EXERCISE ex
      WHERE ex.category_id = c.category_id
        AND ex.name = e.name
  );

-- ============================================================
-- Triceps
-- ============================================================
INSERT INTO EXERCISE (category_id, name, description)
WITH exercises(name) AS (
    SELECT 'Tricep Dip' FROM dual
    UNION ALL SELECT 'Skull Crusher' FROM dual
    UNION ALL SELECT 'Tricep Pushdown' FROM dual
    UNION ALL SELECT 'Overhead Tricep Extension' FROM dual
    UNION ALL SELECT 'Close-Grip Bench Press' FROM dual
    UNION ALL SELECT 'Rope Pushdown' FROM dual
    UNION ALL SELECT 'Straight-Bar Pushdown' FROM dual
    UNION ALL SELECT 'Reverse-Grip Pushdown' FROM dual
    UNION ALL SELECT 'Single-Arm Cable Pushdown' FROM dual
    UNION ALL SELECT 'JM Press' FROM dual
    UNION ALL SELECT 'Bench Dip' FROM dual
    UNION ALL SELECT 'Diamond Push-Up' FROM dual
    UNION ALL SELECT 'Dumbbell Kickback' FROM dual
    UNION ALL SELECT 'Lying Dumbbell Tricep Extension' FROM dual
    UNION ALL SELECT 'Seated Overhead Dumbbell Extension' FROM dual
    UNION ALL SELECT 'Cable Overhead Extension' FROM dual
    UNION ALL SELECT 'EZ-Bar Skull Crusher' FROM dual
    UNION ALL SELECT 'Machine Dip' FROM dual
    UNION ALL SELECT 'Close-Grip Push-Up' FROM dual
    UNION ALL SELECT 'Cross-Body Tricep Extension' FROM dual
)
SELECT c.category_id, e.name, ''
FROM EXERCISE_CATEGORY c
CROSS JOIN exercises e
WHERE c.name = 'Triceps'
  AND NOT EXISTS (
      SELECT 1
      FROM EXERCISE ex
      WHERE ex.category_id = c.category_id
        AND ex.name = e.name
  );

-- ============================================================
-- Shoulders
-- ============================================================
INSERT INTO EXERCISE (category_id, name, description)
WITH exercises(name) AS (
    SELECT 'Overhead Press' FROM dual
    UNION ALL SELECT 'Lateral Raise' FROM dual
    UNION ALL SELECT 'Front Raise' FROM dual
    UNION ALL SELECT 'Cable Raise' FROM dual
    UNION ALL SELECT 'Face Pull' FROM dual
    UNION ALL SELECT 'Arnold Press' FROM dual
    UNION ALL SELECT 'Seated Dumbbell Press' FROM dual
    UNION ALL SELECT 'Machine Shoulder Press' FROM dual
    UNION ALL SELECT 'Rear Delt Fly' FROM dual
    UNION ALL SELECT 'Reverse Pec Deck' FROM dual
    UNION ALL SELECT 'Upright Row' FROM dual
    UNION ALL SELECT 'Landmine Press' FROM dual
    UNION ALL SELECT 'Single-Arm Cable Lateral Raise' FROM dual
    UNION ALL SELECT 'Bent-Over Lateral Raise' FROM dual
    UNION ALL SELECT 'Cable Front Raise' FROM dual
    UNION ALL SELECT 'Barbell Overhead Press' FROM dual
    UNION ALL SELECT 'Dumbbell Shrug' FROM dual
    UNION ALL SELECT 'Snatch-Grip High Pull' FROM dual
    UNION ALL SELECT 'Scaption Raise' FROM dual
    UNION ALL SELECT 'Plate Front Raise' FROM dual
)
SELECT c.category_id, e.name, ''
FROM EXERCISE_CATEGORY c
CROSS JOIN exercises e
WHERE c.name = 'Shoulders'
  AND NOT EXISTS (
      SELECT 1
      FROM EXERCISE ex
      WHERE ex.category_id = c.category_id
        AND ex.name = e.name
  );

-- ============================================================
-- Back
-- ============================================================
INSERT INTO EXERCISE (category_id, name, description)
WITH exercises(name) AS (
    SELECT 'Pull-Up' FROM dual
    UNION ALL SELECT 'Barbell Row' FROM dual
    UNION ALL SELECT 'Lat Pulldown' FROM dual
    UNION ALL SELECT 'Seated Cable Row' FROM dual
    UNION ALL SELECT 'Chin-Up' FROM dual
    UNION ALL SELECT 'T-Bar Row' FROM dual
    UNION ALL SELECT 'Single-Arm Dumbbell Row' FROM dual
    UNION ALL SELECT 'Chest-Supported Row' FROM dual
    UNION ALL SELECT 'Pendlay Row' FROM dual
    UNION ALL SELECT 'Inverted Row' FROM dual
    UNION ALL SELECT 'Straight-Arm Pulldown' FROM dual
    UNION ALL SELECT 'Meadow Row' FROM dual
    UNION ALL SELECT 'Machine Row' FROM dual
    UNION ALL SELECT 'Wide-Grip Pulldown' FROM dual
    UNION ALL SELECT 'Neutral-Grip Pulldown' FROM dual
    UNION ALL SELECT 'Rack Pull' FROM dual
    UNION ALL SELECT 'Deadlift' FROM dual
    UNION ALL SELECT 'Close-Grip Cable Row' FROM dual
    UNION ALL SELECT 'Reverse-Grip Barbell Row' FROM dual
    UNION ALL SELECT 'Assisted Pull-Up' FROM dual
)
SELECT c.category_id, e.name, ''
FROM EXERCISE_CATEGORY c
CROSS JOIN exercises e
WHERE c.name = 'Back'
  AND NOT EXISTS (
      SELECT 1
      FROM EXERCISE ex
      WHERE ex.category_id = c.category_id
        AND ex.name = e.name
  );

-- ============================================================
-- Chest
-- ============================================================
INSERT INTO EXERCISE (category_id, name, description)
WITH exercises(name) AS (
    SELECT 'Barbell Bench Press' FROM dual
    UNION ALL SELECT 'Incline Dumbbell Press' FROM dual
    UNION ALL SELECT 'Cable Fly' FROM dual
    UNION ALL SELECT 'Push-Up' FROM dual
    UNION ALL SELECT 'Decline Bench Press' FROM dual
    UNION ALL SELECT 'Flat Dumbbell Press' FROM dual
    UNION ALL SELECT 'Incline Barbell Press' FROM dual
    UNION ALL SELECT 'Decline Dumbbell Press' FROM dual
    UNION ALL SELECT 'Machine Chest Press' FROM dual
    UNION ALL SELECT 'Pec Deck Fly' FROM dual
    UNION ALL SELECT 'Dumbbell Fly' FROM dual
    UNION ALL SELECT 'Incline Cable Fly' FROM dual
    UNION ALL SELECT 'Decline Push-Up' FROM dual
    UNION ALL SELECT 'Weighted Push-Up' FROM dual
    UNION ALL SELECT 'Single-Arm Cable Press' FROM dual
    UNION ALL SELECT 'Svend Press' FROM dual
    UNION ALL SELECT 'Floor Press' FROM dual
    UNION ALL SELECT 'Hammer Strength Chest Press' FROM dual
    UNION ALL SELECT 'Low-to-High Cable Fly' FROM dual
    UNION ALL SELECT 'High-to-Low Cable Fly' FROM dual
)
SELECT c.category_id, e.name, ''
FROM EXERCISE_CATEGORY c
CROSS JOIN exercises e
WHERE c.name = 'Chest'
  AND NOT EXISTS (
      SELECT 1
      FROM EXERCISE ex
      WHERE ex.category_id = c.category_id
        AND ex.name = e.name
  );

-- ============================================================
-- Legs
-- ============================================================
INSERT INTO EXERCISE (category_id, name, description)
WITH exercises(name) AS (
    SELECT 'Barbell Back Squat' FROM dual
    UNION ALL SELECT 'Romanian Deadlift' FROM dual
    UNION ALL SELECT 'Leg Press' FROM dual
    UNION ALL SELECT 'Walking Lunge' FROM dual
    UNION ALL SELECT 'Leg Curl' FROM dual
    UNION ALL SELECT 'Calf Raise' FROM dual
    UNION ALL SELECT 'Leg Extension' FROM dual
    UNION ALL SELECT 'Front Squat' FROM dual
    UNION ALL SELECT 'Goblet Squat' FROM dual
    UNION ALL SELECT 'Bulgarian Split Squat' FROM dual
    UNION ALL SELECT 'Hack Squat' FROM dual
    UNION ALL SELECT 'Hip Thrust' FROM dual
    UNION ALL SELECT 'Glute Bridge' FROM dual
    UNION ALL SELECT 'Step-Up' FROM dual
    UNION ALL SELECT 'Sumo Deadlift' FROM dual
    UNION ALL SELECT 'Seated Leg Curl' FROM dual
    UNION ALL SELECT 'Standing Calf Raise' FROM dual
    UNION ALL SELECT 'Seated Calf Raise' FROM dual
    UNION ALL SELECT 'Reverse Lunge' FROM dual
    UNION ALL SELECT 'Smith Machine Squat' FROM dual
)
SELECT c.category_id, e.name, ''
FROM EXERCISE_CATEGORY c
CROSS JOIN exercises e
WHERE c.name = 'Legs'
  AND NOT EXISTS (
      SELECT 1
      FROM EXERCISE ex
      WHERE ex.category_id = c.category_id
        AND ex.name = e.name
  );

-- ============================================================
-- Abs
-- ============================================================
INSERT INTO EXERCISE (category_id, name, description)
WITH exercises(name) AS (
    SELECT 'Plank' FROM dual
    UNION ALL SELECT 'Crunch' FROM dual
    UNION ALL SELECT 'Hanging Leg Raise' FROM dual
    UNION ALL SELECT 'Cable Crunch' FROM dual
    UNION ALL SELECT 'Bicycle Crunch' FROM dual
    UNION ALL SELECT 'Reverse Crunch' FROM dual
    UNION ALL SELECT 'V-Up' FROM dual
    UNION ALL SELECT 'Russian Twist' FROM dual
    UNION ALL SELECT 'Ab Wheel Rollout' FROM dual
    UNION ALL SELECT 'Mountain Climber' FROM dual
    UNION ALL SELECT 'Toe Touch' FROM dual
    UNION ALL SELECT 'Dead Bug' FROM dual
    UNION ALL SELECT 'Flutter Kick' FROM dual
    UNION ALL SELECT 'Hollow Body Hold' FROM dual
    UNION ALL SELECT 'Side Plank' FROM dual
    UNION ALL SELECT 'Dragon Flag' FROM dual
    UNION ALL SELECT 'Sit-Up' FROM dual
    UNION ALL SELECT 'Swiss Ball Crunch' FROM dual
    UNION ALL SELECT 'Knee Tuck' FROM dual
    UNION ALL SELECT 'Weighted Decline Crunch' FROM dual
)
SELECT c.category_id, e.name, ''
FROM EXERCISE_CATEGORY c
CROSS JOIN exercises e
WHERE c.name = 'Abs'
  AND NOT EXISTS (
      SELECT 1
      FROM EXERCISE ex
      WHERE ex.category_id = c.category_id
        AND ex.name = e.name
  );

-- ============================================================
-- Cardio
-- ============================================================
INSERT INTO EXERCISE (category_id, name, description)
WITH exercises(name) AS (
    SELECT 'Treadmill Run' FROM dual
    UNION ALL SELECT 'Run' FROM dual
    UNION ALL SELECT 'Rowing Machine' FROM dual
    UNION ALL SELECT 'Jump Rope' FROM dual
    UNION ALL SELECT 'Stationary Bike' FROM dual
)
SELECT c.category_id, e.name, ''
FROM EXERCISE_CATEGORY c
CROSS JOIN exercises e
WHERE c.name = 'Cardio'
  AND NOT EXISTS (
      SELECT 1
      FROM EXERCISE ex
      WHERE ex.category_id = c.category_id
        AND ex.name = e.name
  );

exit;