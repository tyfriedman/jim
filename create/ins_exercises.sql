-- ============================================================
-- Seed: EXERCISE_CATEGORY + EXERCISE
-- ============================================================

INSERT INTO EXERCISE_CATEGORY (name) VALUES ('Biceps');
INSERT INTO EXERCISE_CATEGORY (name) VALUES ('Triceps');
INSERT INTO EXERCISE_CATEGORY (name) VALUES ('Shoulders');
INSERT INTO EXERCISE_CATEGORY (name) VALUES ('Back');
INSERT INTO EXERCISE_CATEGORY (name) VALUES ('Chest');
INSERT INTO EXERCISE_CATEGORY (name) VALUES ('Legs');
INSERT INTO EXERCISE_CATEGORY (name) VALUES ('Abs');
INSERT INTO EXERCISE_CATEGORY (name) VALUES ('Cardio');

-- ============================================================
-- Biceps
-- ============================================================
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Biceps'), 'Barbell Curl', 'Stand with feet shoulder-width apart, grip a barbell with an underhand grip, and curl the bar toward your chest while keeping elbows stationary.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Biceps'), 'Hammer Curl', 'Hold a dumbbell in each hand with a neutral (palms-facing) grip and curl the weights toward your shoulders, targeting the brachialis and brachioradialis.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Biceps'), 'Preacher Curl', 'Seated, rest your elbow against a 45 degree angled pad, grip a barbell with an underhand grip, and curl the bar toward your chest.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Biceps'), 'Incline Dumbbell Curl', 'Lie back on an incline bench, let your arms hang straight down, and curl both dumbbells simultaneously for a greater stretch at the bottom.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Biceps'), 'Cable Curl', 'Attach a straight or EZ-bar to a low pulley, stand facing the machine, and curl the handle up to maintain constant tension throughout the movement.');

-- ============================================================
-- Triceps
-- ============================================================
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Triceps'), 'Tricep Dip', 'Using parallel bars or a bench, lower your body by bending your elbows to roughly 90 degrees, then press back up to full extension.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Triceps'), 'Skull Crusher', 'Lie on a bench holding an EZ-bar or dumbbells above your chest, then hinge only at the elbows to lower the weight toward your forehead before pressing back up.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Triceps'), 'Tricep Pushdown', 'Stand at a high pulley cable station, grip the bar with an overhand grip, and press it straight down until your arms are fully extended.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Triceps'), 'Overhead Tricep Extension', 'Hold a dumbbell or EZ-bar overhead with arms straight, then lower the weight behind your head by bending your elbows before pressing back to the start.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Triceps'), 'Close-Grip Bench Press', 'Perform a bench press with hands placed shoulder-width (or slightly narrower) apart to shift the load onto the triceps rather than the chest.');

-- ============================================================
-- Shoulders
-- ============================================================
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Shoulders'), 'Overhead Press', 'Standing or seated, press a barbell or dumbbells from shoulder height straight up overhead until your arms are fully extended, then lower under control.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Shoulders'), 'Lateral Raise', 'Hold a dumbbell in each hand at your sides and raise them out to shoulder height with a slight bend in the elbows, then lower slowly.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Shoulders'), 'Front Raise', 'Hold dumbbells or a plate in front of your thighs and lift them straight in front of you to shoulder height to target the anterior deltoid.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Shoulders'), 'Cable raise', 'Start perpendicular to the cable. With the grip at waist height, raise your arm from your side to shoulder height.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Shoulders'), 'Face Pull', 'Attach a rope to a high pulley, pull it toward your face while flaring your elbows out, and squeeze your rear delts and external rotators at peak contraction.');

-- ============================================================
-- Back
-- ============================================================
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Back'), 'Pull-Up', 'Hang from a bar with an overhand grip wider than shoulder width, pull your chest up to the bar by driving your elbows toward your hips, then lower with control.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Back'), 'Barbell Row', 'Hinge at the hips with a flat back, grip a barbell with an overhand grip, and row the bar toward your lower chest by driving your elbows back and up.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Back'), 'Lat Pulldown', 'Sit at a lat pulldown machine, grip the bar wide and overhand, and pull it down to your upper chest while keeping your torso slightly reclined.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Back'), 'Seated Cable Row', 'Sit at a cable row station with a neutral grip, keep your back straight, and pull the handle to your abdomen while squeezing your shoulder blades together.');

-- ============================================================
-- Chest
-- ============================================================
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Chest'), 'Barbell Bench Press', 'Lie on a flat bench, lower a barbell to mid-chest, then press it back to full arm extension while keeping your feet flat on the floor and shoulder blades retracted.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Chest'), 'Incline Dumbbell Press', 'Set a bench to 30-45 degrees, press dumbbells from chest height up and together to target the upper chest.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Chest'), 'Cable Fly', 'Stand between two cable towers with handles set at chest height, bring your arms together in a wide hugging motion, and squeeze your pecs at the centre.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Chest'), 'Push-Up', 'In a high plank position, lower your chest to the floor by bending your elbows to roughly 45 degrees from your torso, then press back to the start.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Chest'), 'Tricep Extension', 'Stand at a high pulley cable station, grip the bar with an overhand grip, and press it straight down until your arms are fully extended.');

-- ============================================================
-- Legs
-- ============================================================
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Legs'), 'Barbell Back Squat', 'With a barbell across your upper back, feet shoulder-width apart, descend until your thighs are at least parallel to the floor, then drive back to standing.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Legs'), 'Romanian Deadlift', 'Hold a barbell at hip height, hinge at the hips while keeping your back flat and legs nearly straight, lowering the bar along your shins until you feel a stretch in your hamstrings.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Legs'), 'Leg Press', 'Sit in a leg press machine, place feet hip-width apart on the platform, and press the platform away by extending your knees and hips without locking out.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Legs'), 'Walking Lunge', 'Step forward with one foot and lower your back knee toward the floor, then bring your rear foot forward to meet the front foot and repeat on the other side.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Legs'), 'Leg Curl', 'Lie face down on a leg curl machine, hook your ankles under the pad, and curl your heels toward your glutes to isolate the hamstrings.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Legs'), 'Calf Raise', 'Stand on the edge of a step or calf raise platform, drop your heels below the surface, then rise onto your toes and pause at the top for a full contraction.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Legs'), 'Leg Extension', 'Sit in a leg extension machine with your ankles hooked under the pad, then extend your knees to raise the weight until your legs are straight, pausing briefly at the top before lowering under control.');

-- ============================================================
-- Abs
-- ============================================================
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Abs'), 'Plank', 'Hold a forearm plank position with a rigid, straight body line from head to heels, bracing your core throughout the duration of the hold.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Abs'), 'Crunch', 'Lie on your back with knees bent, curl your shoulder blades off the floor by contracting your abs, then lower with control.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Abs'), 'Hanging Leg Raise', 'Hang from a pull-up bar and raise your legs (bent or straight) until they are parallel to the floor or higher, then lower slowly without swinging.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Abs'), 'Cable Crunch', 'Kneel in front of a high cable pulley, grip a rope behind your head, and crunch your elbows toward your knees by flexing your spine, not your hips.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Abs'), 'Bicycle Crunch', 'Lying on your back, alternate bringing each elbow toward the opposite knee in a pedalling motion while extending the other leg, engaging the obliques.');

-- ============================================================
-- Cardio
-- ============================================================
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Cardio'), 'Treadmill Run', 'Running on a treadmill.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Cardio'), 'Run', 'Running outside.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Cardio'), 'Rowing Machine', 'Full-body cardio using a rowing machine.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Cardio'), 'Jump Rope', 'Skip a rope at a pace that elevates your heart rate.');
INSERT INTO EXERCISE (category_id, name, description) VALUES ((SELECT category_id FROM EXERCISE_CATEGORY WHERE name = 'Cardio'), 'Stationary Bike', 'Low-impact cardiovascular exercise on a stationary cycle.');

exit;