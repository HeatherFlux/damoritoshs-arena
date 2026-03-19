import type { SceneType, SceneTension } from '../types/adventure'

// ===== UTILITIES =====

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function fillTemplate(template: string, banks: Record<string, string[]>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key) => {
    const bank = banks[key]
    return bank ? pick(bank) : key
  })
}

// ===== SHARED WORD BANKS =====

// Reuse factions from hackingGenerator concept
const FACTIONS = [
  'AbadarCorp', 'Zo!', 'the Stewards', 'the Starfinder Society', 'Hellknight Order',
  'the Aspis Consortium', 'the Azlanti Star Empire', 'the Veskarium', 'the Pact Worlds Council',
  'the Corpse Fleet', 'the Free Captains', 'the Xenowardens', 'the Android Abolitionist Front',
  'the Augmented', 'the Church of Triune', 'the Golden League', 'the Skyfire Legion',
]

const LOCATIONS = [
  'Absalom Station', 'Akiton', 'Verces', 'Aballon', 'Eox', 'Castrovel', 'Triaxus',
  'Bretheda', 'Apostae', 'the Diaspora', 'Idari', 'the Drift', 'Preluria', 'Daimalko',
  'a remote outpost', 'a derelict freighter', 'a mining colony', 'a space station',
]

const NPC_TYPES = [
  'a desperate merchant', 'a rogue operative', 'a corrupt official', 'a bounty hunter',
  'a marooned pilot', 'an alien dignitary', 'a street-level fixer', 'a paranoid scientist',
  'a retired mercenary', 'a zealous priest', 'an undercover agent', 'a smuggler captain',
  'a dock worker', 'a mysterious stranger', 'a child in danger', 'an old rival',
  'a wounded soldier', 'a panicked engineer', 'a defecting spy', 'a sentient AI',
]

const COMPLICATIONS = [
  'a sudden power failure', 'an unexpected betrayal', 'a ticking countdown',
  'hostile reinforcements', 'a collapsing structure', 'a hostage situation',
  'a moral dilemma', 'a shifting allegiance', 'an environmental hazard',
  'a communication blackout', 'a rival faction arriving', 'a hidden trap activating',
  'an innocent caught in the crossfire', 'a sudden hull breach', 'a Drift storm',
  'an ancient defense system awakening', 'a distress signal from nearby',
]

const HOOKS = [
  'offers a job that seems too good to be true',
  'begs for help with a dangerous problem',
  'reveals a secret that changes everything',
  'is being hunted and asks for protection',
  'has information about a missing person',
  'needs an escort through hostile territory',
  'wants to hire the party for a heist',
  'warns of an imminent attack',
  'claims to know the truth about a recent event',
  'offers a rare piece of technology as payment',
  'has been framed and needs to clear their name',
  'is carrying something extremely valuable',
]

// ===== STRONG START TEMPLATES =====

const STRONG_START_TEMPLATES = [
  'The session opens mid-crisis: {COMPLICATION} forces the party to react immediately aboard {LOCATION}.',
  '{NPC} bursts through a door, bleeding, and gasps out a warning about {COMPLICATION} before collapsing.',
  'An explosion rocks the station. Alarms blare. Through the smoke, the party sees {NPC} running toward them.',
  'The party\'s ship drops out of Drift travel — but this isn\'t their destination. Sensors show {COMPLICATION}.',
  'A priority message arrives from {FACTION}: the party has 30 minutes before {COMPLICATION}.',
  'The session begins at a tense negotiation between {FACTION} and {FACTION}. Then {COMPLICATION}.',
  '{NPC} {HOOK}. But before the party can respond, {COMPLICATION}.',
  'The party wakes to find their ship has been boarded. {NPC} stands over them with a weapon drawn.',
  'A distress beacon leads to a derelict vessel near {LOCATION}. The airlock is already open.',
  'The marketplace erupts into chaos as {COMPLICATION}. {NPC} grabs the nearest PC and shouts for help.',
  'Gravity fails. Emergency lights flicker red. {NPC} floats past, unconscious, as {COMPLICATION}.',
  'The party is mid-meal at a cantina when {NPC} slides into their booth and says: "They\'re coming."',
  'A bounty posting appears on every screen in the station — and it has the party\'s faces on it.',
  'The party arrives at {LOCATION} to find it completely abandoned. Except for the sound of something breathing.',
  'A mysterious package arrives addressed to one of the PCs. Inside: a data chip and a severed finger.',
  'The session opens with a chase — the party is being pursued through {LOCATION} by agents of {FACTION}.',
  'An old debt comes due: {NPC} appears and reminds a PC of a promise they made long ago.',
  'The ship\'s AI announces an unidentified vessel on an intercept course. It\'s not responding to hails.',
  'The party is hired by {FACTION} to investigate why all communication from {LOCATION} has gone silent.',
  'A Drift storm strands the party in an unknown system. Their sensors pick up something enormous nearby.',
]

// ===== SCENE TEMPLATES =====

const COMBAT_ENEMIES = [
  'corporate security forces', 'Corpse Fleet undead', 'pirate raiders', 'rogue drones',
  'alien predators', 'mercenary thugs', 'cult fanatics', 'Azlanti soldiers',
  'space goblins', 'malfunctioning robots', 'gang enforcers', 'bounty hunters',
  'swarm creatures', 'possessed crew members', 'rival adventurers',
]

const COMBAT_ENVIRONMENTS = [
  'a cramped cargo bay', 'an exposed catwalk above a reactor', 'a zero-gravity corridor',
  'a jungle clearing with bioluminescent plants', 'a collapsing mine shaft',
  'the bridge of a damaged starship', 'a crowded marketplace', 'a toxic waste facility',
  'a rooftop during a storm', 'an airlock with a timer counting down',
  'a shuttle bay with ships taking off', 'a frozen corridor venting atmosphere',
]

const COMBAT_HAZARDS = [
  'explosive barrels', 'unstable flooring', 'automated turrets', 'toxic gas vents',
  'electrified panels', 'collapsing debris', 'a spreading fire', 'zero-gravity zones',
  'radiation leaks', 'moving machinery', 'a countdown to decompression',
]

const COMBAT_TEMPLATES = [
  '{ENEMIES} ambush the party in {ENVIRONMENT}. Watch out for {HAZARD}.',
  'The party must fight through {ENEMIES} to reach a critical objective in {ENVIRONMENT}.',
  'An alarm triggers — {ENEMIES} swarm from multiple directions in {ENVIRONMENT}.',
  'A standoff with {ENEMIES} goes wrong. Combat erupts in {ENVIRONMENT} with {HAZARD} nearby.',
  '{ENEMIES} are guarding a hostage in {ENVIRONMENT}. The party needs to take them out quietly — or fast.',
  'The party is pinned down by {ENEMIES} in {ENVIRONMENT}. {HAZARD} makes staying put just as dangerous.',
  'A running battle through {ENVIRONMENT} as {ENEMIES} give chase. {HAZARD} blocks the obvious escape route.',
  'Two groups of {ENEMIES} and {ENEMIES} are fighting each other. The party is caught in the middle in {ENVIRONMENT}.',
  'The party must hold {ENVIRONMENT} against waves of {ENEMIES} until reinforcements arrive.',
  'A boss fight: the leader of {ENEMIES} makes a last stand in {ENVIRONMENT}, surrounded by {HAZARD}.',
  '{ENEMIES} attack during a Drift jump. The party fights in {ENVIRONMENT} while reality warps around them.',
  'An escort mission goes wrong when {ENEMIES} attack in {ENVIRONMENT}.',
  'The party faces {ENEMIES} in {ENVIRONMENT}. The twist: {HAZARD} threatens everyone equally.',
  'A desperate defense as {ENEMIES} breach the hull. {ENVIRONMENT} is venting atmosphere.',
  'The party discovers {ENEMIES} performing a dark ritual in {ENVIRONMENT}. Stopping them means combat.',
]

const EXPLORATION_TERRAINS = [
  'an uncharted alien jungle', 'a derelict generation ship', 'an abandoned mining complex',
  'a floating asteroid city', 'a crashed starship overgrown with vegetation',
  'an underwater alien ruin', 'a frozen moon with geothermal vents', 'a Drift-scarred wasteland',
  'a living bioship interior', 'a malfunctioning space station', 'ancient alien catacombs',
  'a planet with reversed gravity zones',
]

const EXPLORATION_DISCOVERIES = [
  'a hidden cache of pre-Gap technology', 'ancient alien writing on the walls',
  'signs of recent habitation', 'a functioning but alien piece of technology',
  'evidence of a cover-up', 'a map leading deeper', 'a survivor from a previous expedition',
  'alien eggs in an incubation chamber', 'a sealed vault with biometric locks',
  'the remains of something enormous', 'a distress beacon buried under rubble',
  'a portal to somewhere else', 'a power source still humming after centuries',
]

const EXPLORATION_OBSTACLES = [
  'a collapsed passageway requiring creative navigation',
  'a security system that\'s still active after centuries',
  'environmental hazards: toxic atmosphere, radiation, or extreme temperatures',
  'a chasm with no obvious way across',
  'a locked door with a puzzle-based mechanism',
  'a flooded section requiring underwater navigation',
  'unstable terrain that could give way at any moment',
  'a guardian creature that isn\'t necessarily hostile',
  'a labyrinthine layout designed to confuse intruders',
  'a force field blocking the path forward',
]

const EXPLORATION_TEMPLATES = [
  'The party explores {TERRAIN}. They discover {DISCOVERY}, but face {OBSTACLE}.',
  'Navigating through {TERRAIN}, the party encounters {OBSTACLE}. Beyond it: {DISCOVERY}.',
  'A survey mission in {TERRAIN} reveals {DISCOVERY}. Getting to it requires overcoming {OBSTACLE}.',
  'The party pushes deeper into {TERRAIN}. {OBSTACLE} forces a detour, leading to {DISCOVERY}.',
  'While searching {TERRAIN} for supplies, the party stumbles upon {DISCOVERY}.',
  '{TERRAIN} is more dangerous than expected. {OBSTACLE} threatens the party, but {DISCOVERY} awaits.',
  'An expedition into {TERRAIN} uncovers {DISCOVERY}. But they aren\'t the only ones looking for it.',
  'Lost in {TERRAIN}, the party must navigate past {OBSTACLE} to find their way out.',
  'The party follows a trail through {TERRAIN} that leads to {DISCOVERY} — and {OBSTACLE}.',
  'Mapping {TERRAIN}, the party finds {DISCOVERY} behind {OBSTACLE}. Is it worth the risk?',
  'A strange signal leads the party through {TERRAIN} to {DISCOVERY}.',
  'The party must cross {TERRAIN} under time pressure. {OBSTACLE} slows them down.',
]

const SOCIAL_NPC_TYPES = [
  'a paranoid station administrator', 'a charming crime boss', 'a conflicted military officer',
  'a grieving family member', 'a manipulative politician', 'a desperate refugee leader',
  'an eccentric collector', 'a righteous but inflexible judge', 'a rival party of adventurers',
  'a mysterious information broker', 'a disillusioned cult member', 'an alien ambassador',
  'a journalist investigating the party', 'a merchant with a hidden agenda',
]

const SOCIAL_STAKES = [
  'access to a restricted area', 'crucial information about their mission',
  'safe passage through hostile territory', 'an alliance against a common enemy',
  'the release of a prisoner', 'a pardon for past crimes',
  'funding for their next expedition', 'a ship upgrade or repair',
  'evidence needed to prove someone\'s innocence', 'a ceasefire between warring factions',
  'permission to land on a restricted world', 'the truth about a conspiracy',
]

const SOCIAL_SETTINGS = [
  'a high-stakes gala on Absalom Station', 'a seedy cantina in the lower decks',
  'a formal hearing before a council', 'a tense backroom negotiation',
  'a funeral where secrets might spill', 'a marketplace during a festival',
  'a prison visiting room', 'a diplomatic vessel in neutral space',
  'a virtual reality meeting space', 'a sacred temple where violence is forbidden',
]

const SOCIAL_TEMPLATES = [
  'The party must convince {SOCIAL_NPC} to grant them {STAKES} during {SETTING}.',
  'A negotiation with {SOCIAL_NPC} at {SETTING}. The real prize: {STAKES}.',
  '{SOCIAL_NPC} has what the party needs ({STAKES}), but their price is steep. Scene: {SETTING}.',
  'The party must navigate a tense conversation with {SOCIAL_NPC} to secure {STAKES}.',
  'At {SETTING}, the party discovers {SOCIAL_NPC} is playing both sides. {STAKES} hangs in the balance.',
  'A social encounter at {SETTING}: {SOCIAL_NPC} tests the party before offering {STAKES}.',
  'The party attends {SETTING} to gather intel. {SOCIAL_NPC} is the key to {STAKES}.',
  'A confrontation with {SOCIAL_NPC} at {SETTING} — but violence isn\'t an option. {STAKES} is on the line.',
  '{SOCIAL_NPC} invites the party to {SETTING} for a deal. Something feels wrong about {STAKES}.',
  'At {SETTING}, the party must choose between {SOCIAL_NPC}\'s offer and doing what\'s right. {STAKES}.',
  'A debate at {SETTING}: the party argues for {STAKES} against {SOCIAL_NPC}.',
  'The party must earn {SOCIAL_NPC}\'s trust at {SETTING} to obtain {STAKES}.',
]

const PUZZLE_TEMPLATES = [
  'An ancient alien mechanism blocks progress. The party must decode its controls using environmental clues.',
  'A locked data vault requires solving a logic puzzle to access — but each wrong attempt triggers a defense.',
  'The party finds a map fragment that doesn\'t match any known star chart. Figuring out where it leads is key.',
  'A malfunctioning AI speaks in riddles and requires the party to answer correctly before it cooperates.',
  'A room with shifting walls and floors that rearrange on a timer. The party must find the pattern.',
  'Multiple consoles must be activated simultaneously in the correct sequence to open a sealed door.',
  'An alien language must be deciphered using visual context clues scattered throughout the area.',
  'A containment field can only be lowered by redirecting power through a series of conduits.',
  'The party finds a dead explorer\'s journal with coded entries that reveal the way forward.',
  'A holographic projection shows a star map with missing pieces. The party must fill in the gaps.',
]

const CHASE_TEMPLATES = [
  'A high-speed chase through a crowded space station — the party must catch a fleeing suspect before they reach the docks.',
  'The party flees through a collapsing facility as explosions chain behind them.',
  'A vehicle chase across an alien desert, dodging natural hazards and pursuing enemies.',
  'The party races against a rival group to reach a crash site first. Obstacles litter the path.',
  'An on-foot chase through a zero-gravity maze. The quarry knows the layout; the party doesn\'t.',
  'The party must escape a flooding underwater facility, navigating sealed doors and rising water.',
  'A rooftop chase across a vertical city. One wrong jump means a very long fall.',
  'Pursuit through Drift space — the party\'s ship chases a target through unstable reality bubbles.',
]

const HEIST_TEMPLATES = [
  'The party must infiltrate a corporate tower to steal data from a secured server. Security is tight.',
  'A museum heist: the target is an alien artifact under heavy guard and multiple alarm systems.',
  'The party must break someone out of a high-security prison station without raising the alarm.',
  'Infiltrating a {FACTION} facility to plant evidence. The clock is ticking.',
  'A casino heist: the vault is below the gaming floor, protected by both tech and magic security.',
  'The party must swap a genuine artifact with a fake during a public exhibition.',
  'Breaking into a quarantined lab to retrieve a sample before the facility is destroyed.',
  'The party must steal a ship from a guarded impound lot without being identified.',
  'An inside job: one PC is undercover in a {FACTION} operation. Time to make the grab.',
  'The party must intercept a secure courier during a short window of vulnerability.',
]

const STARSHIP_TEMPLATES = [
  'A pirate flotilla ambushes the party in an asteroid field. Maneuver and fight.',
  'The party must escort a civilian transport through hostile space while fending off attackers.',
  'A massive creature emerges from the Drift and attacks the ship. All hands to battle stations.',
  'The party\'s ship is caught in a crossfire between two warring fleets. Escape or pick a side.',
  'A disabled vessel sends a distress call — but approaching it means navigating a debris field and potential ambush.',
  'The party must outrun a faster pursuer through a dangerous nebula, using the environment to their advantage.',
  'A boarding action: enemies latch onto the hull. Repel boarders while keeping the ship flying.',
  'The party discovers a space anomaly. Investigating it draws the attention of something hostile.',
  'A race against another ship to reach a jump point first. Obstacles and combat along the way.',
  'The party\'s ship is pulled into a gravity well. They must fight their way free while under fire.',
]

// ===== SECRET TEMPLATES =====

const SECRET_ASSETS = [
  'a prototype weapon', 'a blackmail dossier', 'a star map to an uncharted system',
  'the last copy of a forbidden AI', 'a shipment of illegal biotech', 'diplomatic credentials',
  'a pre-Gap artifact', 'a key to a sealed vault', 'a living specimen of an extinct species',
  'coordinates to a hidden base', 'a cure for a rare disease', 'a compromised encryption key',
  'a ledger of illegal transactions', 'a list of undercover agents',
]

const SECRET_ACTIONS = [
  'has been secretly funding', 'is planning to betray', 'has been spying on',
  'is blackmailing', 'has framed', 'has been smuggling resources to',
  'is negotiating a secret deal with', 'has placed an agent inside',
  'has been sabotaging', 'is planning an assassination targeting',
  'has been covering up evidence against', 'is building a weapon aimed at',
]

const SECRET_GOALS = [
  'to seize control of the station', 'to start a war between factions',
  'to cover up a terrible accident', 'to resurrect an ancient evil',
  'to corner the market on a vital resource', 'to escape before the truth comes out',
  'to find a missing person who knows too much', 'to activate a dormant weapon',
  'to prevent a prophecy from being fulfilled', 'to open a permanent Drift gate',
  'to achieve immortality through forbidden science', 'to destroy evidence of genocide',
]

const SECRETS_LOW_TEMPLATES = [
  '{NPC} knows the real location of {ASSET} but is afraid to speak openly.',
  'The {FACTION} agent at the bar has been eavesdropping on the party for two days.',
  'There\'s a hidden passage in the lower decks that bypasses the security checkpoint.',
  'The local merchant is selling counterfeit goods — and knows who stole the real ones.',
  '{NPC} owes a favor to someone in {FACTION} and can be convinced to help.',
  'The maintenance logs show someone accessed a restricted area at 0300 last night.',
  'A coded message was left at the dead drop — it mentions the party by name.',
  'The missing person was last seen arguing with {NPC} three days ago.',
  '{FACTION} {ACTION} the local authorities — but the evidence is circumstantial.',
  'The data chip they found is encrypted with a key only {NPC} possesses.',
  'A seemingly unrelated crime shares the same MO as the main case.',
  'The previous tenants of this facility left in a hurry. Their personal effects are still here.',
  '{NPC} has been secretly meeting with representatives of {FACTION}.',
  'The victim\'s last transmission was sent to an unknown recipient on {LOCATION}.',
  'Someone has been tampering with the station\'s sensor logs around the time of the incident.',
]

const SECRETS_MEDIUM_TEMPLATES = [
  '{FACTION} {ACTION} {FACTION} {GOAL}.',
  '{NPC} is not who they claim to be — they\'re actually working for {FACTION}.',
  'The "accident" that killed the previous crew was actually sabotage by someone still aboard.',
  '{ASSET} is hidden somewhere in {LOCATION}, guarded by {FACTION}.',
  'The distress signal that brought the party here was a trap set by {FACTION}.',
  '{NPC} has discovered that {FACTION} {ACTION} the colony {GOAL}.',
  'The creature attacks aren\'t random — something is directing them from {LOCATION}.',
  'There\'s a mole in {FACTION} who has been leaking information {GOAL}.',
  '{FACTION} is willing to pay a fortune for {ASSET} — no questions asked.',
  'The abandoned facility isn\'t empty. Something has been living in the lower levels.',
  '{NPC} carries a recording that proves {FACTION} {ACTION} the government.',
  'The planet\'s environment is changing — and it\'s not natural. Someone is terraforming it.',
  'The "rescue mission" is actually a cover for {FACTION} to retrieve {ASSET}.',
  'Two members of {FACTION} are planning a coup against their leadership.',
  'The technology the party found is a prototype that {FACTION} thought was destroyed.',
]

const SECRETS_HIGH_TEMPLATES = [
  '{FACTION} has developed a weapon capable of destroying an entire station, and it\'s pointed at {LOCATION}.',
  'The person the party is protecting is actually the one responsible for the massacre.',
  '{FACTION} {ACTION} the Pact Worlds {GOAL} — and they\'re weeks away from succeeding.',
  'The Drift storm that stranded the party wasn\'t natural — it was created by {FACTION} to isolate them.',
  '{ASSET} contains the consciousness of an ancient entity that will awaken if activated.',
  'The colony the party is heading to has already fallen. {FACTION} is covering it up.',
  '{NPC} is the last survivor of an experiment that created a plague — and they\'re contagious.',
  'The "allies" who offered help are planning to sacrifice the party {GOAL}.',
  '{FACTION} has compromised the Drift beacon network. Ships are disappearing.',
  'The artifact the party carries is a key to a prison holding something that should never be released.',
  'A senior member of {FACTION} has been replaced by a shapeshifter working {GOAL}.',
  'The planet isn\'t uninhabited — its inhabitants are in stasis, and they\'re about to wake up. All of them.',
  '{FACTION} has been experimenting on sentient beings {GOAL}. The party has found the lab.',
  'The timer isn\'t a bomb — it\'s a beacon calling something from the Drift. Something big.',
  'The truth about the Gap: {NPC} has recovered a fragment of memory that changes everything.',
]

// ===== LOCATION TEMPLATES =====

const LOCATION_ADJECTIVES = [
  'abandoned', 'fortified', 'crumbling', 'hidden', 'floating', 'underground',
  'overgrown', 'irradiated', 'sacred', 'corrupted', 'ancient', 'makeshift',
  'luxurious', 'grimy', 'haunted', 'frozen', 'scorched', 'submerged',
  'crystalline', 'organic', 'holographic', 'dimensionally-unstable',
]

const LOCATION_STRUCTURES = [
  'space station', 'outpost', 'temple', 'bunker', 'marketplace', 'shipyard',
  'laboratory', 'archive', 'arena', 'prison', 'refinery', 'observatory',
  'cantina', 'embassy', 'monastery', 'factory', 'spaceport', 'habitat dome',
  'data center', 'med-bay complex', 'warehouse district', 'transit hub',
  'memorial', 'museum', 'terraforming facility', 'relay tower',
]

const LOCATION_VISTAS = [
  'overlooking a gas giant\'s swirling storms', 'built into the side of an asteroid',
  'perched on a cliff above an alien ocean', 'surrounded by bioluminescent fungal forests',
  'floating in the upper atmosphere', 'carved into an ancient glacier',
  'nestled in the ruins of a pre-Gap city', 'orbiting a dying star',
  'hidden inside a nebula', 'at the edge of a massive canyon',
  'in the shadow of an alien megastructure', 'at a crossroads of Drift lanes',
  'beneath the surface of a frozen moon', 'on a platform between two waterfalls',
]

const LOCATION_ENVIRONMENTS = [
  'space station', 'alien jungle', 'desert world', 'frozen moon', 'gas giant platform',
  'asteroid belt', 'underwater colony', 'volcanic wasteland', 'Drift pocket',
  'urban sprawl', 'orbital habitat', 'derelict ship', 'crystal caves',
  'living bioship', 'dimensional rift', 'ancient ruins',
]

const LOCATION_TEMPLATES = [
  'A {ADJ} {STRUCTURE} {VISTA}. The air here feels {VIBE}.',
  'The {ADJ} {STRUCTURE} of {LOCATION} — once grand, now {CONDITION}.',
  'A {STRUCTURE} on {LOCATION}, {VISTA}. It serves as {PURPOSE}.',
  'This {ADJ} {STRUCTURE} is built from {MATERIAL}. {VISTA}.',
  'A converted {STRUCTURE} now functioning as {PURPOSE}. The {ADJ} interior still echoes with its past.',
  'The {STRUCTURE} rises from the landscape, {VISTA}. {DETAIL}.',
  'A {ADJ}, {ADJ2} {STRUCTURE} that locals call "{NICKNAME}". {VISTA}.',
  'Beneath the surface: a {ADJ} {STRUCTURE} connected by {PASSAGES}.',
  'A {STRUCTURE} at the heart of {LOCATION}, {VISTA}. The centerpiece: {FEATURE}.',
  'The remains of a {ADJ} {STRUCTURE}, now repurposed by {OCCUPANT}.',
  'A mobile {STRUCTURE} — it moves slowly across the landscape of {LOCATION}.',
  'Twin {STRUCTURE}s connected by a skybridge, {VISTA}.',
  'A {ADJ} {STRUCTURE} hidden behind {CONCEALMENT}. Few know it exists.',
  'The {STRUCTURE} is alive — its walls pulse with {ENERGY}.',
  'A {STRUCTURE} floating in zero-gravity, accessible only by {ACCESS}.',
  'This {ADJ} {STRUCTURE} was designed by {BUILDER} and abandoned when {EVENT}.',
  'A cramped {STRUCTURE} packed with {CONTENTS}. {VISTA}.',
  'The {ADJ} {STRUCTURE} serves as neutral ground between {FACTION} and {FACTION2}.',
  'A towering {STRUCTURE} {VISTA}. Its upper levels are unexplored.',
  'What appears to be a simple {STRUCTURE} conceals {SECRET} beneath its floor.',
]

const LOCATION_VIBES = [
  'heavy with ozone and old machinery', 'thin and cold, barely breathable',
  'warm and humid, thick with spores', 'sterile and too-quiet',
  'charged with static electricity', 'sweet with decay',
]

const LOCATION_CONDITIONS = [
  'gutted by fire', 'reclaimed by nature', 'frozen in time', 'hollowed out by scavengers',
  'reinforced by squatters', 'partially submerged', 'pristine — suspiciously so',
]

const LOCATION_PURPOSES = [
  'a meeting point for smugglers', 'a refuge for the displaced', 'a secret research lab',
  'a black market hub', 'a pilgrimage site', 'a forward operating base',
  'a cultural archive', 'a quarantine zone', 'a listening post',
]

const LOCATION_MATERIALS = [
  'living coral and bioengineered wood', 'salvaged starship hull plating',
  'ancient alien crystal', 'raw asteroid rock and ice', 'self-repairing nanomaterials',
]

// ===== NPC TEMPLATES =====

const NPC_ANCESTRIES = [
  'Android', 'Barathu', 'Dwarf', 'Elf', 'Gnome', 'Goblin', 'Halfling',
  'Human', 'Kasatha', 'Lashunta', 'Pahtra', 'Shirren', 'Skittermander',
  'Vesk', 'Vlaka', 'Ysoki',
]

const NPC_MOTIVATIONS = [
  'wants revenge for a personal betrayal', 'seeks redemption for past crimes',
  'is trying to protect someone they love', 'craves power at any cost',
  'wants to uncover a buried truth', 'needs money desperately',
  'is driven by religious conviction', 'wants to be left alone but can\'t',
  'seeks acceptance from a community that rejected them', 'is running from their past',
  'is trying to prevent a catastrophe only they know about', 'wants fame and recognition',
  'is addicted to something dangerous', 'is fulfilling a promise to a dead friend',
  'wants to see the galaxy before they die', 'is plotting to overthrow a corrupt leader',
  'is searching for a lost family member', 'needs to pay off a massive debt',
]

const NPC_HOOKS_TEXT = [
  'They\'re hiding something under their coat that occasionally moves.',
  'They speak in a dialect the party hasn\'t heard before.',
  'They have a visible injury they refuse to explain.',
  'They seem to know more about the party than they should.',
  'They keep glancing at the exits as if expecting trouble.',
  'They offer help freely — too freely.',
  'They carry an obviously expensive item that doesn\'t match their appearance.',
  'They mutter to themselves in two different voices.',
  'They have a reputation that precedes them — but is it deserved?',
  'They\'re the last person the party would expect to find here.',
  'They flinch at a specific sound or word during conversation.',
  'They leave behind a personal item that contains a clue.',
  'They seem to be testing the party\'s reactions to specific topics.',
  'They\'re being watched by someone else in the room.',
  'They have a cybernetic modification that\'s clearly military-grade.',
  'They carry a child\'s toy that they handle with great care.',
  'They recognize one of the PCs but won\'t say from where.',
  'They\'ve been asking around about the party before approaching.',
  'They have a tattoo or brand marking them as part of a known group.',
  'They\'re incredibly skilled at something that doesn\'t match their stated profession.',
]

const NPC_ROLES_LIST: Array<'ally' | 'questgiver' | 'rival' | 'wildcard' | 'innocent'> = [
  'ally', 'questgiver', 'rival', 'wildcard', 'innocent',
]

const NPC_TEMPLATES = [
  'A {ANCESTRY} {MOTIVATION}. {HOOK}',
  '{ANCESTRY} — {MOTIVATION}. {HOOK}',
  'This {ANCESTRY} {MOTIVATION}. What makes them interesting: {HOOK}',
  'A {ANCESTRY} who {MOTIVATION}. {HOOK}',
  '{ANCESTRY}. Motivation: {MOTIVATION}. {HOOK}',
  'An unlikely {ANCESTRY}: {MOTIVATION}. {HOOK}',
  '{ANCESTRY} with a secret — {MOTIVATION}. {HOOK}',
  'This {ANCESTRY} {MOTIVATION}. Players should notice: {HOOK}',
  'A scarred {ANCESTRY} who {MOTIVATION}. {HOOK}',
  'Young {ANCESTRY}: {MOTIVATION}. {HOOK}',
  'An aging {ANCESTRY} who {MOTIVATION}. {HOOK}',
  'A well-connected {ANCESTRY}: {MOTIVATION}. {HOOK}',
  '{ANCESTRY} outcast — {MOTIVATION}. {HOOK}',
  'A charming {ANCESTRY} who {MOTIVATION}. But: {HOOK}',
  'A quiet {ANCESTRY}: {MOTIVATION}. {HOOK}',
  'This {ANCESTRY} seems ordinary, but {MOTIVATION}. {HOOK}',
  'A desperate {ANCESTRY}: {MOTIVATION}. {HOOK}',
  'A {ANCESTRY} of few words who {MOTIVATION}. {HOOK}',
  'An eccentric {ANCESTRY} — {MOTIVATION}. {HOOK}',
  'A dangerous {ANCESTRY}: {MOTIVATION}. {HOOK}',
]

// ===== EXPORTED TYPES =====

export interface GeneratedScene {
  text: string
  type: SceneType
  tension: SceneTension
}

export interface GeneratedSecret {
  text: string
  dangerLevel: 'low' | 'medium' | 'high'
}

export interface GeneratedLocation {
  text: string
  environment: string
}

export interface GeneratedNPCEntry {
  text: string
  role: 'ally' | 'questgiver' | 'rival' | 'wildcard' | 'innocent'
  ancestry: string
}

// ===== GENERATOR FUNCTIONS =====

export function generateStrongStart(): string {
  const banks: Record<string, string[]> = {
    NPC: NPC_TYPES,
    FACTION: FACTIONS,
    LOCATION: LOCATIONS,
    COMPLICATION: COMPLICATIONS,
    HOOK: HOOKS,
  }
  return fillTemplate(pick(STRONG_START_TEMPLATES), banks)
}

export function generateScene(type?: SceneType): GeneratedScene {
  const sceneType = type || pick<SceneType>(['combat', 'exploration', 'social', 'puzzle', 'chase', 'heist', 'starship'])
  let text: string
  let tension: SceneTension

  switch (sceneType) {
    case 'combat':
      text = fillTemplate(pick(COMBAT_TEMPLATES), {
        ENEMIES: COMBAT_ENEMIES,
        ENVIRONMENT: COMBAT_ENVIRONMENTS,
        HAZARD: COMBAT_HAZARDS,
      })
      tension = pick<SceneTension>(['medium', 'high', 'high', 'climax'])
      break
    case 'exploration':
      text = fillTemplate(pick(EXPLORATION_TEMPLATES), {
        TERRAIN: EXPLORATION_TERRAINS,
        DISCOVERY: EXPLORATION_DISCOVERIES,
        OBSTACLE: EXPLORATION_OBSTACLES,
      })
      tension = pick<SceneTension>(['low', 'medium', 'medium'])
      break
    case 'social':
      text = fillTemplate(pick(SOCIAL_TEMPLATES), {
        SOCIAL_NPC: SOCIAL_NPC_TYPES,
        STAKES: SOCIAL_STAKES,
        SETTING: SOCIAL_SETTINGS,
      })
      tension = pick<SceneTension>(['low', 'medium', 'high'])
      break
    case 'puzzle':
      text = pick(PUZZLE_TEMPLATES)
      tension = pick<SceneTension>(['low', 'medium'])
      break
    case 'chase':
      text = pick(CHASE_TEMPLATES)
      tension = pick<SceneTension>(['medium', 'high', 'high'])
      break
    case 'heist':
      text = fillTemplate(pick(HEIST_TEMPLATES), { FACTION: FACTIONS })
      tension = pick<SceneTension>(['medium', 'high'])
      break
    case 'starship':
      text = pick(STARSHIP_TEMPLATES)
      tension = pick<SceneTension>(['medium', 'high', 'climax'])
      break
    default:
      text = pick(COMBAT_TEMPLATES)
      tension = 'medium'
  }

  return { text, type: sceneType, tension }
}

export function generateScenes(count: number = 3): GeneratedScene[] {
  return Array.from({ length: count }, () => generateScene())
}

export function generateSecret(dangerLevel?: 'low' | 'medium' | 'high'): GeneratedSecret {
  const level = dangerLevel || pick<'low' | 'medium' | 'high'>(['low', 'medium', 'medium', 'high'])
  const banks: Record<string, string[]> = {
    NPC: NPC_TYPES,
    FACTION: FACTIONS,
    LOCATION: LOCATIONS,
    ASSET: SECRET_ASSETS,
    ACTION: SECRET_ACTIONS,
    GOAL: SECRET_GOALS,
  }

  let templates: string[]
  switch (level) {
    case 'low': templates = SECRETS_LOW_TEMPLATES; break
    case 'medium': templates = SECRETS_MEDIUM_TEMPLATES; break
    case 'high': templates = SECRETS_HIGH_TEMPLATES; break
  }

  return {
    text: fillTemplate(pick(templates), banks),
    dangerLevel: level,
  }
}

export function generateSecrets(count: number = 3): GeneratedSecret[] {
  return Array.from({ length: count }, () => generateSecret())
}

export function generateLocation(): GeneratedLocation {
  const banks: Record<string, string[]> = {
    ADJ: LOCATION_ADJECTIVES,
    ADJ2: LOCATION_ADJECTIVES,
    STRUCTURE: LOCATION_STRUCTURES,
    VISTA: LOCATION_VISTAS,
    LOCATION: LOCATIONS,
    VIBE: LOCATION_VIBES,
    CONDITION: LOCATION_CONDITIONS,
    PURPOSE: LOCATION_PURPOSES,
    MATERIAL: LOCATION_MATERIALS,
    FACTION: FACTIONS,
    FACTION2: FACTIONS,
    NICKNAME: ['The Hollow', 'Dead Man\'s Rest', 'The Crucible', 'The Cage', 'Ghost Light',
      'The Spike', 'Rust Haven', 'The Beacon', 'Null Point', 'The Furnace'],
    PASSAGES: ['narrow tunnels', 'mag-rail corridors', 'flooded channels', 'zero-g shafts'],
    FEATURE: ['a massive crystal formation', 'a dormant engine', 'a holographic memorial',
      'an alien tree growing through the floor', 'a sealed chamber'],
    OCCUPANT: ['scavengers', 'refugees', 'a cult', 'wildlife', 'a rogue AI'],
    CONCEALMENT: ['a holographic wall', 'dense vegetation', 'a false asteroid', 'sensor jammers'],
    ENERGY: ['bioluminescent veins', 'arcane circuitry', 'an unknown power source'],
    ACCESS: ['EVA suits', 'a rickety bridge', 'teleportation pads', 'a pressurized tunnel'],
    BUILDER: ['pre-Gap engineers', 'an unknown alien species', 'a forgotten AI', 'the Azlanti'],
    EVENT: ['the Gap erased their memory of it', 'a catastrophe struck', 'funding was cut',
      'something was unleashed'],
    CONTENTS: ['salvaged tech', 'alien specimens', 'weapons caches', 'ancient texts'],
    SECRET: ['a hidden vault', 'an alien burial site', 'a functioning portal', 'a power core'],
    DETAIL: ['Locals avoid it after dark.', 'Strange signals emanate from within.',
      'The last expedition never returned.', 'It appears on no official maps.'],
  }

  const text = fillTemplate(pick(LOCATION_TEMPLATES), banks)
  const environment = pick(LOCATION_ENVIRONMENTS)

  return { text, environment }
}

export function generateLocations(count: number = 3): GeneratedLocation[] {
  return Array.from({ length: count }, () => generateLocation())
}

export function generateNPCEntry(): GeneratedNPCEntry {
  const ancestry = pick(NPC_ANCESTRIES)
  const banks: Record<string, string[]> = {
    ANCESTRY: [ancestry],
    MOTIVATION: NPC_MOTIVATIONS,
    HOOK: NPC_HOOKS_TEXT,
  }

  const text = fillTemplate(pick(NPC_TEMPLATES), banks)
  const role = pick(NPC_ROLES_LIST)

  return { text, role, ancestry }
}

export function generateNPCEntries(count: number = 3): GeneratedNPCEntry[] {
  return Array.from({ length: count }, () => generateNPCEntry())
}
