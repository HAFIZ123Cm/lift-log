// Coach guides: what each exercise trains, how to do it, and the mistakes seen most often in gyms.
// Plans below point to these by id; the exercise name in a plan can be changed freely.
const GUIDES = {
  bench: {
    name: "Barbell Bench Press",
    primary: ["Chest (pecs)"], secondary: ["Front shoulders", "Triceps"],
    setup: [
      "Lie down so your eyes are right under the bar.",
      "Pull your shoulder blades together and down, like putting them in your back pockets. Keep them there the whole set.",
      "Small arch in your upper back. Butt stays on the bench. Feet flat and pushing hard into the floor.",
      "Grip a little wider than shoulders. Thumb wrapped around the bar. The bar sits low in your palm, over the wrist bones, not near your fingers."
    ],
    steps: [
      "Unrack with straight arms and move the bar over your shoulders.",
      "Take a big breath into your belly and hold it.",
      "Lower the bar slowly (about 2 seconds) to your lower chest, around nipple line.",
      "Keep elbows about 45–70° from your body. Not flared out wide, not glued to your ribs.",
      "Touch the chest lightly (no bounce), then press up and slightly back toward your face.",
      "Breathe out at the top, take a new breath, next rep."
    ],
    cues: ["“Bend the bar” — try to snap it in half. This turns on your lats.", "“Push yourself away from the bar” into the bench.", "Forearms straight up and down at the bottom."],
    mistakes: [
      ["Bouncing the bar off the chest", "Takes work away from the chest and can hurt your sternum. Control it down and pause for a split second."],
      ["Elbows flared out to 90°", "The #1 cause of shoulder pain on bench. Tuck them to about 45–70°."],
      ["Butt lifting off the bench", "The weight is too heavy. Push with your legs but keep your glutes down."],
      ["Wrists bent backwards", "The bar has rolled to your fingers. Keep it low in the palm over the forearm."],
      ["Loose shoulder blades", "Shoulders roll forward and take the load. Set them back and keep them pinned."],
      ["Half reps", "Stopping far above the chest. Touch the chest every rep, or the weight is too heavy."],
      ["Going heavy alone with no safety", "Set the safety arms or ask someone to spot you when you go near failure."]
    ],
    tip: "Add weight in small jumps (1–2.5 kg). Stuck for 3 sessions in a row? Drop 10% and build back up."
  },
  incline_db: {
    name: "Incline Dumbbell Press",
    primary: ["Upper chest"], secondary: ["Front shoulders", "Triceps"],
    setup: [
      "Set the bench to a low incline: 15–30°. Higher than that turns it into a shoulder press.",
      "Sit with the dumbbells on your thighs. Lie back and use your knees to kick them up.",
      "Shoulder blades back and down, chest up, feet planted."
    ],
    steps: [
      "Start with the dumbbells over your upper chest, palms facing your feet or slightly turned in.",
      "Lower them slowly until you feel a deep stretch in the chest. Elbows go slightly under the dumbbells, about 45° from the body.",
      "Press up and slightly in. The dumbbells come close at the top but don't need to clank.",
      "Keep 2 seconds down, strong push up."
    ],
    cues: ["Think “elbows toward each other” as you press.", "Keep your chest high the whole time."],
    mistakes: [
      ["Bench too steep (45° or more)", "Shoulders do the work, not the upper chest. Drop it to 15–30°."],
      ["Tiny range of motion", "Lowering only halfway. The stretch at the bottom is where the growth is."],
      ["Dumbbells drifting toward the face", "Press over the upper chest, not over the eyes."],
      ["Dropping the dumbbells sideways at the end", "Hurts shoulders and other people. Bring them to your chest, then sit up with them on your thighs."]
    ],
    tip: "Dumbbells usually jump 2 kg at a time. If you can't add weight, add 1–2 reps first."
  },
  db_shoulder_press: {
    name: "Seated Dumbbell Shoulder Press",
    primary: ["Front & side shoulders (delts)"], secondary: ["Triceps", "Upper chest"],
    setup: [
      "Bench almost upright (about 80°, one notch below straight).",
      "Back flat on the pad, feet wide and planted.",
      "Kick the dumbbells up to shoulder height. Palms forward or slightly turned in."
    ],
    steps: [
      "Start with dumbbells beside your ears, elbows slightly in front of your body (not straight out to the sides).",
      "Press up until arms are almost straight. The dumbbells move slightly inward at the top.",
      "Lower slowly until the dumbbells are about ear or chin level.",
      "Keep your ribs down — don't arch your lower back off the pad."
    ],
    cues: ["“Ribs down, brace your belly.”", "“Push your head through the window” at the top."],
    mistakes: [
      ["Big lower-back arch", "Turns it into an incline press and loads your spine. Lower the weight and keep your back on the pad."],
      ["Elbows straight out to the sides", "Pinches the shoulder. Bring elbows a little forward."],
      ["Not lowering far enough", "Going down only a few centimetres. Get to ear level."],
      ["Banging the dumbbells together at the top", "Keeps no tension on the muscle. Stop just before they touch."]
    ],
    tip: "Shoulders are small muscles. Small jumps and more reps work better than forcing heavy weight."
  },
  ohp: {
    name: "Standing Barbell Overhead Press",
    primary: ["Front shoulders"], secondary: ["Side shoulders", "Triceps", "Upper back", "Core"],
    setup: [
      "Bar in the rack at upper-chest height. Grip just outside your shoulders.",
      "Bar rests on your front shoulders, elbows slightly in front of the bar.",
      "Feet hip-width. Squeeze your glutes and brace your belly hard."
    ],
    steps: [
      "Move your head back a little and press the bar straight up past your face.",
      "Once it passes your forehead, push your head forward “through the window”.",
      "Lock out with the bar over the middle of your feet.",
      "Lower under control back to your shoulders."
    ],
    cues: ["“Squeeze glutes, ribs down.”", "Bar path is a straight line — move your head, not the bar."],
    mistakes: [
      ["Leaning back a lot", "Turns into a standing incline bench and hurts the lower back. Squeeze your glutes."],
      ["Bar going forward around the face", "Wastes energy. Move your head back, keep the bar close."],
      ["Using legs to bounce it up", "That's a push press. Fine if planned, but don't do it by accident."]
    ],
    tip: "Overhead press goes up slowly. Even +1 kg a month is real progress."
  },
  lateral_raise: {
    name: "Dumbbell Lateral Raise",
    primary: ["Side shoulders (lateral delts)"], secondary: ["Upper traps"],
    setup: [
      "Stand tall, dumbbells at your sides. Slight bend in the elbows.",
      "Lean forward a tiny bit (about 10°). This lines the side delt up better.",
      "Same exercise on a cable: stand side-on to the cable, handle at hip height."
    ],
    steps: [
      "Raise the arms out to the sides, leading with your elbows, not your hands.",
      "Stop when the arms are about shoulder height. No higher needed.",
      "Pinkies level with or slightly higher than thumbs — imagine pouring water out to the side, but only slightly.",
      "Lower slowly, about 2–3 seconds. Don't let the dumbbells rest at your sides between reps."
    ],
    cues: ["“Push the dumbbells out to the walls”, not up to the ceiling.", "Keep your neck long — shoulders down away from ears."],
    mistakes: [
      ["Swinging with the whole body", "The most common mistake in every gym. Use a weight you can raise with zero swing. Often only 5–8 kg is enough."],
      ["Shrugging", "Traps take over. Keep shoulders down; if you can't, lower the weight."],
      ["Too heavy, too few reps", "Side delts grow best with 12–20 strict reps."],
      ["Dropping the weight fast", "The lowering part builds muscle too. Control it."]
    ],
    tip: "Progress here is mostly reps, not weight. Go from 12 to 15 to 20 reps, then add 1–2 kg."
  },
  cable_fly: {
    name: "Cable Fly / Pec Deck",
    primary: ["Chest (pecs)"], secondary: ["Front shoulders"],
    setup: [
      "Cable: pulleys at shoulder height, one step forward, staggered stance.",
      "Machine: seat so handles are at mid-chest height.",
      "Slight bend in the elbows. Keep that bend locked the whole set."
    ],
    steps: [
      "Open the arms wide until you feel a good chest stretch.",
      "Bring the hands together in a big hugging arc in front of your chest.",
      "Squeeze for one second, then open slowly."
    ],
    cues: ["“Hug a big tree.”", "Think of moving your biceps toward each other, not your hands."],
    mistakes: [
      ["Bending and straightening the elbows", "Turns it into a press. Keep the elbow angle fixed."],
      ["Going too far back with heavy weight", "Over-stretches the shoulder joint. Stretch, but stay in control."],
      ["Shoulders rolling forward", "Keep the chest up and shoulder blades back."]
    ],
    tip: "Use it after pressing for 12–15 reps with a slow stretch."
  },
  dips: {
    name: "Chest Dips",
    primary: ["Lower chest"], secondary: ["Triceps", "Front shoulders"],
    setup: ["Grip the bars, arms straight, shoulders down.", "Lean your body slightly forward for more chest, upright for more triceps."],
    steps: ["Lower slowly until your upper arms are about parallel to the floor.", "Press back up to straight arms without shrugging."],
    cues: ["“Shoulders away from the ears.”", "Chest proud."],
    mistakes: [
      ["Going too deep", "Very deep dips stress the front of the shoulder. Stop at upper arm parallel."],
      ["Shoulders shrugging up", "Push them down and keep them down."],
      ["Kipping / swinging", "Controlled reps only. Use the assisted machine if you can't do clean reps."]
    ],
    tip: "When 3×12 is easy, add a weight belt or dumbbell between your feet."
  },
  pushdown: {
    name: "Cable Triceps Pushdown",
    primary: ["Triceps (outer & middle heads)"], secondary: [],
    setup: [
      "Cable pulley at the top. Rope or straight bar.",
      "Stand close, slight forward lean, elbows tucked at your sides."
    ],
    steps: [
      "Push the handle down until your arms are fully straight. Squeeze the triceps hard for one second.",
      "With a rope, pull the ends apart at the bottom.",
      "Let it come up slowly until your forearms are just above parallel. Elbows don't move."
    ],
    cues: ["“Elbows are glued to your ribs.”", "Only the forearms move — like a door on a hinge."],
    mistakes: [
      ["Elbows moving forward and back", "Shoulders and lats join in. Pin the elbows."],
      ["Leaning over and using body weight", "Too heavy. Stand tall-ish and use the triceps."],
      ["Not locking out", "The full squeeze at the bottom is the point. Straighten all the way."]
    ],
    tip: "Cable stacks differ between gyms. Log the pin number if the weights aren't marked."
  },
  overhead_ext: {
    name: "Overhead Cable Triceps Extension",
    primary: ["Triceps (long head)"], secondary: [],
    setup: [
      "Rope on a low or middle pulley. Turn away from the machine, rope behind your head.",
      "Staggered stance, lean slightly forward, elbows pointing forward and close to your head."
    ],
    steps: [
      "Straighten your arms forward and up until they lock out.",
      "Bend the elbows slowly and let the rope go deep behind your head for a big stretch.",
      "Keep the upper arms still."
    ],
    cues: ["“Elbows point forward, not out.”", "Feel the stretch at the back of the arm near the armpit."],
    mistakes: [
      ["Elbows flaring wide", "Makes it weaker and loads the elbow. Keep them narrow."],
      ["Short range", "The deep stretch is why this exercise works so well. Go deep, slowly."],
      ["Arching the lower back", "Brace your belly, ribs down."]
    ],
    tip: "The long head is the biggest part of the triceps. This one builds arm size well."
  },
  pulldown: {
    name: "Lat Pulldown",
    primary: ["Lats (back width)"], secondary: ["Biceps", "Rear shoulders", "Mid back"],
    setup: [
      "Set the knee pad tight on your thighs so you don't lift up.",
      "Grip a little wider than shoulders, palms facing away.",
      "Sit tall with a small lean back (about 10–15°). Chest up."
    ],
    steps: [
      "First pull your shoulders down away from your ears (no arm bend yet).",
      "Then pull the bar to your upper chest, driving your elbows down toward your back pockets.",
      "Squeeze your lats for a moment at the bottom.",
      "Let the bar go up slowly until your arms are straight and you feel a stretch in the lats."
    ],
    cues: ["“Pull with your elbows, your hands are just hooks.”", "“Chest to the bar.”"],
    mistakes: [
      ["Leaning way back and rowing it", "Using body swing to move heavy weight. Max 15° lean, controlled."],
      ["Pulling behind the neck", "Hard on the shoulders and neck for no benefit. Pull to the front."],
      ["Not letting the arms go straight at the top", "You lose the stretch. Full range each rep."],
      ["Shrugged shoulders the whole set", "Lats never switch on. Shoulders down first, then pull."],
      ["Death grip squeezing", "Forearms and biceps take over. Use a thumbless or light grip, or straps."]
    ],
    tip: "Different gyms have different stacks. If the numbers mean nothing, log the pin number."
  },
  pullup: {
    name: "Pull-up",
    primary: ["Lats"], secondary: ["Biceps", "Mid back", "Core"],
    setup: ["Grip slightly wider than shoulders, palms away.", "Hang with straight arms, legs slightly in front, belly tight."],
    steps: ["Pull shoulders down first.", "Pull until your chin is over the bar, elbows driving down.", "Lower all the way to straight arms, slowly."],
    cues: ["“Pull the bar down to your chest.”", "No swinging."],
    mistakes: [
      ["Half reps with chin never over the bar", "Count only full reps."],
      ["Kipping and swinging", "Builds momentum, not muscle. Strict reps."],
      ["Dropping fast", "Control 2 seconds down."]
    ],
    tip: "Can't do 5 clean reps? Use the assisted machine or a band and log the assistance."
  },
  barbell_row: {
    name: "Barbell Row",
    primary: ["Mid back", "Lats"], secondary: ["Rear shoulders", "Biceps", "Lower back"],
    setup: [
      "Feet hip-width, bar over your mid-foot.",
      "Hinge at the hips with soft knees until your torso is about 30–45° above the floor.",
      "Flat back. Grip slightly wider than shoulders. Brace your belly hard."
    ],
    steps: [
      "Pull the bar to your lower ribs / belly button.",
      "Drive your elbows back and squeeze your shoulder blades together.",
      "Lower under control to straight arms. Your torso angle stays the same the whole set."
    ],
    cues: ["“Elbows to the back pockets.”", "“Chest proud, back flat.”"],
    mistakes: [
      ["Standing up more every rep", "Turns into a shrug with swing. Keep the torso angle fixed."],
      ["Rounded lower back", "Big injury risk. Lower the weight and brace. If you can't keep it flat, use a chest-supported row instead."],
      ["Jerking the weight with the hips", "Some body English is fine at the end, but most reps should be strict."],
      ["Pulling to the chest with flared elbows", "Hits the upper traps more than the lats. Pull lower, to the belly."]
    ],
    tip: "If your lower back is tired from deadlifts or squats, swap to chest-supported row."
  },
  chest_row: {
    name: "Chest-Supported Dumbbell Row",
    primary: ["Mid back", "Lats"], secondary: ["Rear shoulders", "Biceps"],
    setup: ["Incline bench at about 30–45°. Lie chest down, chest on the pad.", "Dumbbells hanging straight down."],
    steps: ["Row the dumbbells toward your hips.", "Squeeze shoulder blades for one second.", "Lower slowly to a full stretch."],
    cues: ["“Chest stays glued to the pad.”"],
    mistakes: [
      ["Lifting the chest off the pad to cheat", "Lower the weight."],
      ["Shrugging up instead of rowing back", "Think elbows back, not shoulders up."]
    ],
    tip: "Great back builder with zero lower-back stress."
  },
  cable_row: {
    name: "Seated Cable Row",
    primary: ["Mid back (rhomboids, middle traps)", "Lats"], secondary: ["Rear shoulders", "Biceps"],
    setup: ["Feet on the plate, knees slightly bent.", "Sit tall, chest up. V-handle or wide bar."],
    steps: [
      "Pull the handle to your belly, elbows close to your body.",
      "Squeeze shoulder blades together, chest up, for one second.",
      "Let the arms go straight and allow your shoulder blades to move forward for a stretch — but keep your back straight."
    ],
    cues: ["“Pull with elbows, not hands.”", "Torso stays still — no rocking."],
    mistakes: [
      ["Rocking back and forth like rowing a boat", "Lower back does the work. Keep the torso nearly still."],
      ["Rounding the back at the front", "Stretch the shoulder blades, not the spine."],
      ["Short pulls without the squeeze", "Pause at the belly every rep."]
    ],
    tip: "Log the pin number if the stack isn't in kg."
  },
  face_pull: {
    name: "Face Pull",
    primary: ["Rear shoulders (rear delts)"], secondary: ["Rotator cuff", "Mid traps"],
    setup: ["Rope on the cable at forehead height.", "Grip with thumbs pointing back toward you. Step back, arms straight."],
    steps: [
      "Pull the rope toward your face, splitting the ends apart.",
      "Finish with hands beside your ears, like a double bicep pose.",
      "Hold one second, return slowly."
    ],
    cues: ["“Pull the rope apart.”", "“Show off your biceps” at the end."],
    mistakes: [
      ["Too heavy, leaning back", "This is a small-muscle health exercise. Go light and strict."],
      ["Pulling to the chest", "Pull high, toward the eyes and forehead."],
      ["Shrugging", "Shoulders down."]
    ],
    tip: "Keeps your shoulders healthy when you bench a lot. 15–20 reps."
  },
  ez_curl: {
    name: "EZ-Bar Curl",
    primary: ["Biceps"], secondary: ["Forearms (brachialis)"],
    setup: ["Stand tall, grip the angled part of the EZ bar about shoulder width.", "Elbows at your sides, slightly in front of your body."],
    steps: [
      "Curl the bar up by bending only at the elbows.",
      "Squeeze the biceps at the top, below chin level.",
      "Lower slowly (2–3 seconds) to fully straight arms."
    ],
    cues: ["“Elbows stay pinned.”", "Pinkies squeeze harder to feel the biceps more."],
    mistakes: [
      ["Swinging with the hips and back", "Lower the weight. If you have to swing, it's too heavy."],
      ["Elbows coming forward at the top", "Front shoulders take over. Keep elbows still."],
      ["Not straightening the arm at the bottom", "Half reps = half results. Full stretch."]
    ],
    tip: "Biceps grow well with 8–12 strict reps. Add reps before adding weight."
  },
  hammer_curl: {
    name: "Hammer Curl",
    primary: ["Brachialis", "Forearms (brachioradialis)"], secondary: ["Biceps"],
    setup: ["Dumbbells at your sides, palms facing your body (like holding hammers)."],
    steps: ["Curl up keeping palms facing each other.", "Squeeze at the top, lower slowly to straight arms."],
    cues: ["Thumbs up the whole time.", "Elbows still."],
    mistakes: [
      ["Swinging", "Strict reps."],
      ["Rushing the lowering part", "Two to three seconds down."]
    ],
    tip: "Makes the arm look thicker from the front and side."
  },
  squat: {
    name: "Barbell Back Squat",
    primary: ["Quads (front thigh)", "Glutes"], secondary: ["Adductors (inner thigh)", "Lower back", "Core"],
    setup: [
      "Bar in the rack at upper-chest height. Set safety pins just below your bottom position.",
      "Bar on your upper traps (not on your neck bone). Hands just outside shoulders, squeeze the bar.",
      "Walk out 2–3 steps. Feet about shoulder width, toes turned out 15–30°."
    ],
    steps: [
      "Big breath into your belly and brace like someone will punch your stomach.",
      "Sit down between your heels. Knees go forward and out over your toes.",
      "Go down until your hip crease is at or below knee level — as deep as you can with a flat back.",
      "Drive up through the whole foot. Chest and hips rise together.",
      "Breathe out at the top, rebrace, next rep."
    ],
    cues: ["“Spread the floor with your feet.”", "“Knees out.”", "“Chest up, push the floor away.”"],
    mistakes: [
      ["Knees caving inward", "Very common and stresses the knees. Push knees out in line with toes. Lighter weight if needed."],
      ["Heels lifting", "Weight shifts to toes. Keep the whole foot down; if mobility is the issue, use small plates under heels or squat shoes."],
      ["Quarter squats with heavy weight", "Looks strong, builds little. Go to parallel or below."],
      ["“Good morning” squat — hips shoot up first", "Quads are too weak for the load. Chest and hips rise together. Lower the weight."],
      ["Rounding at the bottom (butt wink)", "A little is normal; a lot under heavy load is risky. Stop just above the depth where your back rounds."],
      ["Looking up at the ceiling", "Look straight ahead or slightly down."],
      ["No safeties", "Always set the safety pins. Never squat heavy without them."]
    ],
    tip: "Add 2.5–5 kg when you hit the top of your rep range on all sets with good depth."
  },
  rdl: {
    name: "Romanian Deadlift (RDL)",
    primary: ["Hamstrings", "Glutes"], secondary: ["Lower back", "Grip"],
    setup: ["Stand with the bar (or dumbbells) at your hips, feet hip-width.", "Soft knees — a small bend that stays the same the whole rep."],
    steps: [
      "Push your hips straight back like closing a car door with your butt.",
      "Bar slides down your thighs, staying touching or almost touching your legs.",
      "Go down until you feel a strong stretch in the hamstrings — usually just below the knees. Back stays flat.",
      "Squeeze glutes and drive hips forward to stand up."
    ],
    cues: ["“Hips back, not down.”", "“Shave your legs with the bar.”", "Proud chest, long neck."],
    mistakes: [
      ["Rounding the back to go lower", "Depth comes from the hips, not the spine. Stop where your back would round."],
      ["Bending the knees more and more", "It becomes a squat. Keep the small bend fixed."],
      ["Bar drifting away from the legs", "Huge strain on the lower back. Keep it close."],
      ["Leaning back at the top", "Just stand tall and squeeze glutes. No over-extension."]
    ],
    tip: "Use straps if your grip fails before your hamstrings."
  },
  deadlift: {
    name: "Conventional Deadlift",
    primary: ["Glutes", "Hamstrings", "Lower back"], secondary: ["Quads", "Upper back", "Grip"],
    setup: [
      "Bar over your mid-foot (about 3 cm from your shins). Feet hip-width.",
      "Bend down and grip just outside your legs.",
      "Shins forward to touch the bar, chest up, back flat. Pull the slack out of the bar (hear the click)."
    ],
    steps: [
      "Big breath, brace.",
      "Push the floor away with your legs. Bar stays against your legs the whole way.",
      "When the bar passes the knees, drive your hips forward to stand tall.",
      "Lower by pushing hips back first, then bend knees once the bar passes them."
    ],
    cues: ["“Push the floor away.”", "“Bar stays in contact with legs.”", "“Lats tight — protect your armpits.”"],
    mistakes: [
      ["Rounded lower back", "The big one. Lower the weight and set up again."],
      ["Jerking the bar off the floor", "Pull the slack out first, then squeeze it up."],
      ["Hips shooting up first", "Turns it into a stiff-leg lift. Chest and hips rise together."],
      ["Bar too far from shins", "Start with the bar over mid-foot."],
      ["Hyper-extending at the top", "Stand tall, squeeze glutes, done."]
    ],
    tip: "Deadlifts are tiring. 1–3 heavy sets is often enough."
  },
  leg_press: {
    name: "Leg Press",
    primary: ["Quads", "Glutes"], secondary: ["Adductors", "Hamstrings"],
    setup: [
      "Sit back fully, lower back and butt pressed into the pad.",
      "Feet shoulder width in the middle of the platform. Higher feet = more glutes; lower = more quads.",
      "Plate-loaded machine with unmarked plates? Log the number of plates per side."
    ],
    steps: [
      "Release the safety. Lower the platform slowly until your knees are about 90° or deeper.",
      "Push through your whole foot until legs are almost straight — do not lock your knees hard.",
      "Keep your butt on the seat the whole time."
    ],
    cues: ["“Push the floor away with the whole foot.”", "“Knees track over the toes.”"],
    mistakes: [
      ["Butt lifting off the seat at the bottom", "Your lower back is rounding — dangerous with heavy weight. Stop a bit higher."],
      ["Locking the knees hard at the top", "Can hyper-extend the knee. Stop just before full lock."],
      ["Loading 10 plates and doing 5 cm reps", "Classic gym ego. Half the weight, full depth, more muscle."],
      ["Knees caving in", "Push them out in line with your toes."]
    ],
    tip: "Great place to log plates if your gym's plates have no clear weight."
  },
  leg_curl: {
    name: "Leg Curl (lying or seated)",
    primary: ["Hamstrings"], secondary: ["Calves"],
    setup: ["Line up your knee with the machine's pivot point.", "Pad sits just above your heels, not on your calves."],
    steps: ["Curl your heels toward your butt.", "Squeeze for one second.", "Lower slowly, about 3 seconds, to almost straight."],
    cues: ["“Pull heels to butt.”", "Seated: lean forward a little for a bigger stretch."],
    mistakes: [
      ["Hips lifting off the pad (lying)", "Lower the weight. Press hips down."],
      ["Fast, jerky reps", "Hamstrings respond very well to slow lowering."],
      ["Short range", "Full curl, full stretch."]
    ],
    tip: "Seated leg curl usually builds hamstrings a bit better than lying."
  },
  leg_ext: {
    name: "Leg Extension",
    primary: ["Quads"], secondary: [],
    setup: ["Knee lined up with the machine pivot.", "Pad on the lower shin, just above the ankle.", "Hold the handles, sit back."],
    steps: ["Straighten your legs fully and squeeze your quads for one second.", "Lower slowly to about 90° or a bit deeper."],
    cues: ["“Kick and squeeze.”", "Toes pointing up."],
    mistakes: [
      ["Swinging the weight up and dropping it", "Control both ways."],
      ["Butt lifting off the seat", "Too heavy. Hold the handles and sit down."],
      ["Skipping the squeeze at the top", "The top squeeze is the best part."]
    ],
    tip: "Good finisher. 12–15 reps."
  },
  bulgarian: {
    name: "Bulgarian Split Squat",
    primary: ["Quads", "Glutes"], secondary: ["Adductors", "Balance / core"],
    setup: [
      "Back foot laces-down on a bench. Front foot about one long step in front.",
      "Hold dumbbells at your sides. Log the weight of ONE dumbbell."
    ],
    steps: [
      "Lower straight down until your back knee almost touches the floor.",
      "Front heel stays down. Push through the front foot to stand up.",
      "Do all reps on one leg, then switch. Reps in the plan are per leg."
    ],
    cues: ["Slight forward lean = more glutes. Upright = more quads.", "“Drive through the front heel.”"],
    mistakes: [
      ["Front foot too close", "Heel lifts and knee hurts. Step further forward."],
      ["Pushing off the back leg", "The back leg is only for balance."],
      ["Wobbling everywhere", "Go lighter, slower, and hold something for balance if needed."]
    ],
    tip: "Start with your weaker leg and match the reps on the stronger one."
  },
  hip_thrust: {
    name: "Barbell Hip Thrust",
    primary: ["Glutes"], secondary: ["Hamstrings"],
    setup: ["Upper back on a bench, bar over your hips with a pad.", "Feet flat, about shoulder width, shins vertical at the top."],
    steps: ["Drive through heels and lift hips until your body is flat like a table.", "Chin tucked, ribs down. Squeeze glutes hard for 1–2 seconds.", "Lower under control."],
    cues: ["“Look forward, not at the ceiling.”", "“Tuck your pelvis at the top.”"],
    mistakes: [
      ["Arching the lower back at the top", "Glutes switch off. Ribs down, pelvis tucked."],
      ["Feet too far forward", "Hamstrings take over. Shins vertical at the top."]
    ],
    tip: "Plates often unknown at the gym — log plates per side."
  },
  calf_raise: {
    name: "Standing Calf Raise",
    primary: ["Calves (gastrocnemius)"], secondary: ["Soleus"],
    setup: ["Balls of your feet on the edge of the step or platform.", "Knees straight but not locked hard."],
    steps: [
      "Lower your heels as far as you can and hold the deep stretch for 1–2 seconds.",
      "Rise as high as possible onto your big toes. Hold one second.",
      "Slow and full range every rep."
    ],
    cues: ["“Pause at the bottom.”", "Push through the big toe."],
    mistakes: [
      ["Bouncing fast with tiny reps", "This is why most people's calves never grow. Pause at the bottom, full stretch."],
      ["Bending the knees to help", "Keep legs straight to hit the main calf muscle."]
    ],
    tip: "Calves need high reps and patience. 10–15 slow reps with pauses."
  },
  cable_crunch: {
    name: "Cable Crunch",
    primary: ["Abs (rectus abdominis)"], secondary: ["Obliques"],
    setup: ["Rope on a high pulley. Kneel facing the machine, rope beside your head."],
    steps: ["Curl your ribs toward your hips, rounding your spine.", "Squeeze abs at the bottom, return slowly."],
    cues: ["“Ribs to hips.”", "Hips stay still — don't sit back onto your heels."],
    mistakes: [
      ["Pulling with the arms", "Hands stay locked by your head."],
      ["Hinging at the hips instead of crunching", "Your abs don't move the hips. Round the spine."]
    ],
    tip: "Train abs like any muscle: add weight over time."
  }
};

// Days have a key, display name and exercise list. Each exercise has its own uid
// so renaming it keeps its history and "last time" reminder.
function mkEx(prefix, list){
  return list.map(([guide, sets, rmin, rmax, unit], i) => ({
    uid: `${prefix}-${i + 1}`, name: GUIDES[guide].name, guide, sets, rmin, rmax, unit: unit || "kg"
  }));
}
const DEFAULT_SPLITS = {
  ppl: {
    name: "Push / Pull / Legs",
    days: {
      push: { name: "Push", ex: mkEx("push", [["bench",4,6,8],["db_shoulder_press",3,8,10],["incline_db",3,8,12],["lateral_raise",4,12,15],["pushdown",3,10,12],["overhead_ext",3,10,12]]) },
      pull: { name: "Pull", ex: mkEx("pull", [["pulldown",4,8,10],["barbell_row",3,6,8],["cable_row",3,10,12],["face_pull",3,12,15],["ez_curl",3,8,12],["hammer_curl",3,10,12]]) },
      legs: { name: "Legs", ex: mkEx("legs", [["squat",4,5,8],["rdl",3,8,10],["leg_press",3,10,12,"plates"],["leg_curl",3,10,12],["leg_ext",3,12,15],["calf_raise",4,10,15]]) }
    },
    // index 0 = Sunday ... 6 = Saturday
    week: ["rest", "push", "pull", "legs", "push", "pull", "legs"]
  },
  ul: {
    name: "Upper / Lower",
    days: {
      upper: { name: "Upper", ex: mkEx("upper", [["bench",4,6,8],["barbell_row",4,6,8],["db_shoulder_press",3,8,10],["pulldown",3,8,12],["lateral_raise",3,12,15],["ez_curl",2,10,12],["pushdown",2,10,12]]) },
      lower: { name: "Lower", ex: mkEx("lower", [["squat",4,5,8],["rdl",3,8,10],["bulgarian",3,8,10],["leg_curl",3,10,12],["calf_raise",4,10,15],["cable_crunch",3,12,15]]) }
    },
    week: ["rest", "upper", "lower", "rest", "upper", "lower", "rest"]
  }
};
const DAY_COLORS = { push: "var(--c-push)", pull: "var(--c-pull)", legs: "var(--c-legs)", upper: "var(--c-upper)", lower: "var(--c-lower)" };
