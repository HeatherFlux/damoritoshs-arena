import type { SF2eAncestry, PricingTendency, GeneratedNPC } from '../types/npc'
import type { ShopType } from '../types/shop'

// ===== UTILITY =====

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

// ===== ANCESTRY DATA =====

export const ALL_ANCESTRIES: SF2eAncestry[] = [
  'android', 'astrazoan', 'barathu', 'brenneri', 'dwarf', 'elf', 'gnome',
  'goblin', 'halfling', 'human', 'kasatha', 'lashunta', 'maraquoi',
  'pahtra', 'quorlu', 'shirren', 'skittermander', 'stellifera', 'vesk',
  'vlaka', 'witchwyrd', 'xenodruid', 'ysoki',
]

export const ANCESTRY_LABELS: Record<SF2eAncestry, string> = {
  android: 'Android',
  astrazoan: 'Astrazoan',
  barathu: 'Barathu',
  brenneri: 'Brenneri',
  dwarf: 'Dwarf',
  elf: 'Elf',
  gnome: 'Gnome',
  goblin: 'Goblin',
  halfling: 'Halfling',
  human: 'Human',
  kasatha: 'Kasatha',
  lashunta: 'Lashunta',
  maraquoi: 'Maraquoi',
  pahtra: 'Pahtra',
  quorlu: 'Quorlu',
  shirren: 'Shirren',
  skittermander: 'Skittermander',
  stellifera: 'Stellifera',
  vesk: 'Vesk',
  vlaka: 'Vlaka',
  witchwyrd: 'Witchwyrd',
  xenodruid: 'Xenodruid',
  ysoki: 'Ysoki',
}

// Weighted ancestry selection: common species get 3x weight
const ANCESTRY_WEIGHTS: Record<SF2eAncestry, number> = {
  android: 3, astrazoan: 1, barathu: 1, brenneri: 1, dwarf: 2, elf: 2,
  gnome: 2, goblin: 2, halfling: 2, human: 3, kasatha: 3, lashunta: 3,
  maraquoi: 1, pahtra: 1, quorlu: 1, shirren: 3, skittermander: 1,
  stellifera: 1, vesk: 3, vlaka: 1, witchwyrd: 1, xenodruid: 1, ysoki: 3,
}

// ===== NAME TABLES (23 ancestries) =====

interface NameTable {
  first: string[]
  surnames?: string[]
}

const NAME_TABLES: Record<SF2eAncestry, NameTable> = {
  android: {
    first: ['Axiom', 'Celene', 'Echo', 'Forge', 'Glitch', 'Helix', 'Iris', 'Kernel',
            'Lumen', 'Nimbus', 'Opus', 'Pulse'],
  },
  astrazoan: {
    first: ['Azelle', 'Brixom', 'Chael', 'Drynn', 'Essek', 'Fizzle', 'Glopp', 'Hisk',
            'Izzix', 'Jael', 'Kleem', 'Morfel'],
  },
  barathu: {
    first: ['Aaoon', 'Bloobli', 'Crumm', 'Duuune', 'Eelom', 'Fluuba', 'Grooom', 'Huuul',
            'Iilix', 'Jooob', 'Kluuup', 'Luuuma'],
  },
  brenneri: {
    first: ['Brekka', 'Chellu', 'Dorrin', 'Eshka', 'Firren', 'Grelka', 'Huppa', 'Ikkam',
            'Jekka', 'Kurrla', 'Lorrin', 'Mekka'],
    surnames: ['Deepwater', 'Mudriver', 'Softpaw', 'Swiftcurrent', 'Tidewalker', 'Warmstone'],
  },
  dwarf: {
    first: ['Borrik', 'Dorva', 'Grundi', 'Hilda', 'Kazrik', 'Marta', 'Rurik', 'Sigrid',
            'Thorin', 'Ulga', 'Vondal', 'Wren'],
    surnames: ['Deepforge', 'Ironblast', 'Rockjaw', 'Steelhand', 'Stonebrew', 'Voidhammer'],
  },
  elf: {
    first: ['Aelindra', 'Caelith', 'Elowen', 'Faelorn', 'Ithilien', 'Lysara', 'Miravel',
            'Quellan', 'Serelith', 'Thalion', 'Vaelith', 'Zinnia'],
    surnames: ['Brightstar', 'Dawnwhisper', 'Moonweave', 'Starbloom', 'Sunveil', 'Voidleaf'],
  },
  gnome: {
    first: ['Bimble', 'Crinkle', 'Dazzle', 'Fizzwick', 'Gimble', 'Jinxi', 'Nackle',
            'Pockets', 'Quibble', 'Sprocket', 'Tinkle', 'Wobble'],
    surnames: ['Bangwhistle', 'Cogspring', 'Fiddlebits', 'Gearspark', 'Nimbletop', 'Sparkzap'],
  },
  goblin: {
    first: ['Blix', 'Crik', 'Droop', 'Fizgig', 'Gritz', 'Jank', 'Krizz', 'Mogmog',
            'Nix', 'Pokk', 'Razz', 'Splat'],
  },
  halfling: {
    first: ['Brandy', 'Corrin', 'Elodie', 'Finch', 'Garret', 'Ivy', 'Jasper', 'Lidda',
            'Merric', 'Poppy', 'Reed', 'Sage'],
    surnames: ['Brushgather', 'Goodbarrel', 'Greenbottle', 'Hilltopple', 'Lightfoot', 'Underbough'],
  },
  human: {
    first: ['Akira', 'Brennan', 'Celeste', 'Darius', 'Elena', 'Fynn', 'Gabriela', 'Hassan',
            'Ines', 'Jiro', 'Kira', 'Luca'],
    surnames: ['Blackwood', 'Corsova', 'Driftborn', 'Galewind', 'Navarro', 'Starling', 'Voss', 'Zhao'],
  },
  kasatha: {
    first: ['Altronus', 'Damaya', 'Essa', 'Hekkath', 'Ikessa', 'Jalore', 'Kiirem', 'Lekessa',
            'Mulaan', 'Olessa', 'Ralkess', 'Soleth'],
    surnames: ['Dhar-Ka', 'Kel-Tora', 'Mar-Shen', 'Ren-Kolus', 'Sha-Venn', 'Zel-Marrin'],
  },
  lashunta: {
    first: ['Adeyla', 'Callax', 'Desna', 'Elethia', 'Fayeth', 'Ghessil', 'Hylaene', 'Ixara',
            'Jourae', 'Korvessa', 'Lyressa', 'Morae'],
    surnames: ['Castrosylph', 'Dyranthi', 'Kenestri', 'Morvithia', 'Tellurova', 'Yanthiri'],
  },
  maraquoi: {
    first: ['Arkhane', 'Breshtii', 'Chyaal', 'Dreshkii', 'Eyylan', 'Fyyrne', 'Ghaalok',
            'Hyyreth', 'Iyylaan', 'Jyyshk', 'Kyyral', 'Lyyshaan'],
  },
  pahtra: {
    first: ['Aeshi', 'Brinala', 'Chessi', 'Drisha', 'Esshra', 'Farra', 'Grishi', 'Hirsha',
            'Ixali', 'Jhessi', 'Kirsha', 'Lyrrha'],
  },
  quorlu: {
    first: ['Bazalt', 'Chalko', 'Druuz', 'Feltz', 'Granix', 'Hematik', 'Ignus', 'Jaspro',
            'Kalite', 'Lithok', 'Marblix', 'Obsidak'],
  },
  shirren: {
    first: ['Chisk', 'Drisk', 'Esk', 'Hisskt', 'Ixik', 'Kssik', 'Neshk', 'Prisk',
            'Risskt', 'Shisk', 'Trisk', 'Zissk'],
    surnames: ['Bright-Wing', 'Calm-Song', 'Far-Seeker', 'Free-Thought', 'Keen-Sense', 'Star-Touched'],
  },
  skittermander: {
    first: ['Bazz', 'Chippy', 'Doodle', 'Fizzy', 'Giggles', 'Happy', 'Jitters', 'Kaboom',
            'Noodles', 'Peppy', 'Snuggles', 'Wiggles'],
  },
  stellifera: {
    first: ['Aurus', 'Bellux', 'Crysta', 'Diastella', 'Equinara', 'Florux', 'Galaxa',
            'Heliona', 'Iridea', 'Jovara', 'Kosmia', 'Lumara'],
  },
  vesk: {
    first: ['Brokka', 'Dakkus', 'Grolk', 'Hesskar', 'Ikssar', 'Khagg', 'Marvok', 'Naskk',
            'Osskra', 'Prexus', 'Rekssk', 'Trakka'],
    surnames: ['Bonecrusher', 'Ironscale', 'Skullsplitter', 'Steelclaw', 'Warcrest', 'Voidfang'],
  },
  vlaka: {
    first: ['Aowl', 'Breeze', 'Cawla', 'Dusk', 'Ember', 'Frost', 'Growl', 'Howla',
            'Icicle', 'Jowl', 'Keena', 'Luna'],
    surnames: ['Farscent', 'Icehowl', 'Moonwatch', 'Snowtrack', 'Starfur', 'Windrunner'],
  },
  witchwyrd: {
    first: ['Axaan', 'Bazuur', 'Cryelle', 'Drazhul', 'Exaal', 'Fyzzek', 'Ghaazul',
            'Hyraan', 'Izzael', 'Jaxxur', 'Kyzaal', 'Luxaan'],
  },
  xenodruid: {
    first: ['Ashvine', 'Bloomthorn', 'Cedarix', 'Dewmoss', 'Elmara', 'Fernwhisper',
            'Groveheart', 'Hollybark', 'Ivyroot', 'Junipex', 'Kelpweave', 'Lichenbloom'],
  },
  ysoki: {
    first: ['Bisk', 'Chitter', 'Drex', 'Fizz', 'Grik', 'Hix', 'Jex', 'Krik',
            'Nix', 'Pik', 'Rikket', 'Squeak'],
    surnames: ['Cablecut', 'Gearsnatch', 'Pipecrawl', 'Sparktail', 'Tunnelchew', 'Wirejump'],
  },
}

// ===== PERSONALITY TABLES =====

const DISPOSITIONS = [
  'Warm and welcoming, makes every customer feel like a regular',
  'Gruff but fair, respects anyone who knows their gear',
  'Nervously chatty, fills every silence with small talk',
  'Coolly professional, all business with zero small talk',
  'Suspicious of strangers, warms up after a purchase',
  'Boisterous and loud, treats every sale like a celebration',
  'Soft-spoken and patient, never rushes a browser',
  'Sharply sarcastic, but clearly knows their merchandise',
  'Distracted and scatterbrained, but somehow finds everything',
  'Intensely focused, examines every item before selling',
  'Overly friendly, remembers details about every customer',
  'World-weary and cynical, has seen too many scams',
  'Enthusiastic about their wares, gives unsolicited demos',
  'Stoic and unreadable, communicates in short sentences',
  'Apologetic about prices, blames suppliers and tariffs',
  'Theatrical and dramatic, presents each item like a treasure',
  'Paranoid about theft, watches customers like a hawk',
  'Genuinely kind, occasionally slips extras into bags',
]

const MOTIVATIONS = [
  'Saving credits to buy passage off-world',
  'Supporting an extended family back home',
  'Paying off a debt to a dangerous creditor',
  'Funding research into a personal obsession',
  'Collecting enough to retire to a quiet moon',
  'Secretly financing a resistance movement',
  'Amassing wealth to buy a starship',
  'Proving to a rival that they can succeed',
  'Building a reputation as the best dealer in the sector',
  'Keeping the shop alive as a family legacy',
  'Searching for a specific rare item through trade connections',
  'Hiding in plain sight from a past life',
  'Pursuing a vision or prophecy that led them here',
  'Earning citizenship in a new community',
  'Making contacts for a future business venture',
  'Simply loves the craft and couldn\'t do anything else',
]

const QUIRKS = [
  'Constantly polishes or rearranges merchandise',
  'Has a pet creature that roams the shop',
  'Insists on telling the history of every item sold',
  'Hums or sings while working, often off-key',
  'Keeps a loaded weapon behind the counter, visibly',
  'Offers free snacks or drinks to browsing customers',
  'Collects old-tech curiosities and displays them proudly',
  'Always wears gloves, never touches merchandise bare-handed',
  'Speaks to items as if they can hear',
  'Has an extensive tattoo or cybernetic that tells a story',
  'Refuses to sell to anyone who doesn\'t make eye contact',
  'Keeps meticulous handwritten ledgers instead of datapads',
  'Has a signature catchphrase they use for every sale',
  'Taps or fidgets with a particular object when nervous',
  'Always offers exactly one piece of unsolicited advice',
  'Names every piece of inventory and remembers each name',
]

const SECRETS = [
  'Is actually an undercover Steward agent monitoring trade',
  'The shop is a front for a smuggling operation',
  'Has a hidden room with restricted or illegal goods',
  'Owes a life debt to a crime boss who calls in favors',
  'Witnessed a murder and is hiding from the perpetrator',
  'Is in possession of a stolen artifact they can\'t sell',
  'Has been price-fixing with other local merchants',
  'Is slowly being blackmailed by a former business partner',
  'The shop\'s most valuable item is a clever forgery',
  'Is feeding information to a rival merchant guild',
  'Has a sealed crate they were told never to open',
  'Is not who they claim to be — identity is fabricated',
  'Knows the location of a hidden cache from a past war',
  'Has been skimming from a corporate franchise owner',
]

// ===== APPEARANCE TEMPLATES (ancestry-specific) =====

const APPEARANCE_TEMPLATES: Record<SF2eAncestry, string[]> = {
  android: [
    'Matte-silver chassis with glowing blue circuit lines along their jawline',
    'Weathered bronze plating with mismatched replacement parts and green LED eyes',
    'Sleek black casing with holographic display panels embedded in their forearms',
    'Deliberately worn exterior suggesting decades of service, warm amber optical sensors',
    'Pristine white casing with subtle iridescent highlights, perfectly symmetrical features',
    'Industrial-grade frame repurposed for civilian life, still bearing old serial numbers',
    'Custom-painted chassis in bold colors, clearly expressing personality through design',
    'Minimalist design with exposed internal mechanisms visible through transparent panels',
  ],
  astrazoan: [
    'Currently wearing a friendly humanoid face, but their edges shimmer slightly',
    'Their chosen form is stocky and approachable, with occasionally shifting eye color',
    'Appears as a cheerful merchant, though their proportions are ever so slightly off',
    'Wears a face with exaggerated smile lines, perhaps overcompensating in friendliness',
    'Their humanoid form is impeccable — almost too perfect, like a composite of ideals',
    'Subtle tells: fingers occasionally have one too many joints, ears that shift shape',
    'Has settled into this form so long that even they forget what\'s underneath',
    'Their disguise occasionally flickers at the edges when they get emotional',
  ],
  barathu: [
    'A translucent mass of shifting protoplasm hovering behind the counter on grav-pads',
    'Multiple pseudopods handle different tasks simultaneously, each tipped with a tool',
    'Their gelatinous body pulses with bioluminescent patterns as they communicate',
    'Has formed a permanent shelf-like protrusion to display their favorite wares',
    'Bio-pigments shift to display price tags directly on their membrane surface',
    'A compact barathu who has shaped themselves to fit comfortably behind a counter',
    'Wears tiny prosthetic arms grafted onto their membrane for more precise handling',
    'Internal organelles glow different colors depending on their mood',
  ],
  brenneri: [
    'Sleek fur in warm brown tones, wearing a well-tailored merchant\'s vest',
    'Broad, flat tail occasionally thumps the counter when excited about a sale',
    'Whiskers twitch with every transaction, reading the room with keen senses',
    'Damp fur suggests a recent swim, water-resistant apron protecting the goods',
    'Round dark eyes convey genuine warmth, webbed hands gesture expressively',
    'Compact build with thick waterproof fur, spectacles perched on their nose',
    'Carefully groomed with merchant guild pins adorning a leather bandolier',
    'Older brenneri with graying fur around the muzzle and kind, knowing eyes',
  ],
  dwarf: [
    'Broad-shouldered with a magnificently braided beard threaded with wire',
    'Stocky and solid, wearing a heavy work apron covered in tool loops',
    'Cybernetic eye replacing the left one, the prosthetic humming faintly',
    'Intricate geometric tattoos covering their forearms and neck',
    'Short-cropped hair and a no-nonsense expression, arms folded across chest',
    'A well-oiled beard with embedded micro-LEDs that glow during conversation',
    'Scarred hands from years of working with hazardous materials and hot metal',
    'Sturdy frame wrapped in layers of practical clothing, every pocket full',
  ],
  elf: [
    'Tall and graceful, with long hair bound in an elaborate zero-G style',
    'Sharp features softened by laugh lines, wearing flowing merchant robes',
    'Pointed ears adorned with delicate tech jewelry that serves as comms',
    'Luminous eyes that seem to see right through you, but with warmth',
    'Willowy build draped in fabrics from a dozen worlds, each chosen carefully',
    'Hair streaked with unnatural colors, a subtle nod to centuries of reinvention',
    'Elegant hands move with practiced grace, each gesture deliberate',
    'Ancient eyes in a youthful face, crow\'s feet the only hint of their years',
  ],
  gnome: [
    'Barely visible over the counter, standing on a custom-built platform',
    'Wild, multi-colored hair that seems to change shade in different lighting',
    'Oversized goggles pushed up on forehead, pockets stuffed with gadgets',
    'Bright, curious eyes darting between customers and merchandise equally',
    'Wearing an outfit that clashes spectacularly — clearly on purpose',
    'Has modified the entire shop to their height, step-stools everywhere',
    'Animated gestures that nearly knock things off shelves regularly',
    'A tiny frame practically vibrating with barely contained energy',
  ],
  goblin: [
    'Green-skinned and sharp-toothed, grinning with alarming enthusiasm',
    'Oversized ears pierced with dozens of small rings that jingle when they move',
    'Scrappy and small, wearing a coat made from scavenged uniform patches',
    'Yellow eyes gleaming with merchant cunning behind a surprisingly clean counter',
    'Constantly fidgeting, rearranging stock that was perfectly fine before',
    'Wears a too-large hat that keeps sliding over their eyes',
    'Covered in minor burns and stains from testing their own merchandise',
    'Surprisingly well-groomed for a goblin, clearly making an effort',
  ],
  halfling: [
    'Curly-haired and rosy-cheeked, with a welcoming smile for everyone',
    'Small but confident, using a rolling ladder to reach the top shelves',
    'Bare feet on a heated shop floor, cozy vest with embroidered pockets',
    'Bright eyes and quick hands that sort inventory with practiced speed',
    'Round face framed by auburn curls, a pencil perpetually behind one ear',
    'Well-fed and content, clearly samples their own food inventory',
    'Nimble fingers that can wrap a package faster than you can blink',
    'A warm, homey presence that makes the shop feel like a living room',
  ],
  human: [
    'Middle-aged with gray-streaked hair and an easy smile, calloused hands',
    'Young and ambitious, dressed sharp with a datapad always in hand',
    'Weather-beaten face telling stories of frontier trading posts',
    'Cybernetic arm gleaming under the shop lights, used for heavy lifting',
    'Dark skin and bright eyes, traditional family jewelry mixed with tech',
    'Tall and lanky, moves through cluttered aisles with practiced ease',
    'Former military bearing — straight back, watchful eyes, precise movements',
    'Comfortable and well-worn appearance, clearly been behind this counter for years',
  ],
  kasatha: [
    'Four arms folded in a meditative stance, traditional face-wraps concealing expression',
    'Each of their four hands bears calluses from different disciplines of work',
    'Wearing layered desert robes adapted for station life, every fold deliberate',
    'Face-wrap parted just enough to show keen, appraising eyes above',
    'Four-armed efficiency as they simultaneously inventory, sell, and gesture in greeting',
    'Traditional kasatha beads woven into their face-wraps, marking trade accomplishments',
    'Moves with a fluid, four-armed grace that makes simple tasks look ceremonial',
    'Ancient family trade-marks tattooed on their inner wrists, one per arm',
  ],
  lashunta: [
    'Tall and strikingly beautiful, antennae swaying gently as they sense customers',
    'Coraiesta lashunta with an athletic build, antennae adorned with small gems',
    'Damaya lashunta, poised and intellectual, referencing a mental catalog of stock',
    'Their antennae twitch when they sense deception, a natural lie detector',
    'Elegant features with an expression of perpetual mild amusement',
    'Psychic resonance creates a subtle halo effect around their antennae',
    'Dressed in the latest Castrovel fashions, making the shop feel upscale',
    'Sharp, appraising gaze that prices you and your gear at a glance',
  ],
  maraquoi: [
    'Seven-armed and multi-tasking, simultaneously serving three customers',
    'Downy feathers in russet and gold, wearing harnesses instead of shirts',
    'Keen raptor-like eyes tracking every customer\'s hands near the merchandise',
    'Massive wingspan folded tightly in the cramped shop space',
    'Feathered crest rises when excited about a sale, impossible to fake',
    'Perched on a high stool, taloned feet gripping the crossbar',
    'Molting season — stray feathers drift onto merchandise apologetically',
    'Deep, resonant voice that carries through the shop effortlessly',
  ],
  pahtra: [
    'Sleek feline features with tufted ears that rotate toward every sound',
    'Golden fur with dark rosettes, tail curling lazily behind the counter',
    'Retractable claws click on the counter when they\'re thinking about prices',
    'Wearing a jeweled collar that doubles as a sophisticated comm unit',
    'Cat-like eyes with vertical pupils that widen in the shop\'s dim lighting',
    'Luxurious fur meticulously groomed, clearly takes pride in appearance',
    'A languid, stretching posture that belies their razor-sharp attention',
    'Tail flicks with barely concealed irritation at lowball offers',
  ],
  quorlu: [
    'Crystalline silicon body refracting light into rainbow patterns across the shop',
    'Three stumpy legs give them a stable, unhurried gait between shelves',
    'Their rocky exterior is polished to a warm sheen in frequently-touched areas',
    'Mineral veins of copper and gold run through their translucent body',
    'Speaks through vibrations that resonate through the floor and counter',
    'Has carved decorative patterns into their own surface as personal expression',
    'Embedded gemstones serve as both decoration and data storage crystals',
    'Warm to the touch, radiating gentle heat from internal mineral processes',
  ],
  shirren: [
    'Iridescent chitin in shades of deep blue, antennae twitching with interest',
    'Compound eyes reflect the shop lights in mesmerizing patterns',
    'Mandibles click softly when considering a fair price, a thinking habit',
    'Wears a translator pendant, though their Common is nearly perfect',
    'Exoskeleton adorned with hand-painted designs celebrating their individuality',
    'Wings folded flat but occasionally buzzing with excitement over a rare find',
    'Multiple limbs sort and organize with mechanical efficiency and care',
    'A calm, deliberate presence — every decision is a celebration of free will',
  ],
  skittermander: [
    'Six arms in constant motion, organizing, gesturing, and waving simultaneously',
    'Bright yellow fur that\'s impossible to miss, infectious grin plastered on',
    'Bouncing on their feet, barely containing their enthusiasm for helping',
    'Wearing a tiny vest with six sleeves, each pocket holding a different tool',
    'Round, eager eyes that light up the moment anyone walks through the door',
    'Chattering excitedly while three hands wrap a purchase and three gesture wildly',
    'Fur styled in improbable spikes with glitter — "It\'s for the customers!"',
    'Somehow already helping you before you\'ve said what you need',
  ],
  stellifera: [
    'Bioluminescent patterns ripple across their starfish-like body in greeting',
    'Aquatic membranes glisten under the shop lights, contained in a hydration suit',
    'Multiple radial arms reach across the counter with surprising dexterity',
    'Their coloration shifts to match the hues of whatever item they\'re presenting',
    'Communicates through a combination of color shifts and a translation device',
    'Moves with a flowing, tide-like grace that\'s hypnotic to watch',
    'Keeps the shop notably humid — a small fountain burbles in the corner',
    'Their texture changes from smooth to rough depending on their mood',
  ],
  vesk: [
    'Towering and scaled, arms crossed, daring you to try and shoplift',
    'Battle-scarred snout and a missing horn tip, evidence of a warrior past',
    'Gleaming green scales meticulously polished, wearing a merchant\'s sash of rank',
    'Thick tail curled around a stool leg, golden eyes tracking your every move',
    'Surprisingly gentle hands for their size, handling fragile merchandise with care',
    'Decorated in military medals repurposed as shop flair and conversation starters',
    'A deep, rumbling voice that makes the shelves vibrate slightly',
    'Younger vesk with unblemished scales, eager to prove themselves in commerce',
  ],
  vlaka: [
    'Dense white fur with misty breath even in climate-controlled spaces',
    'Sightless eyes but navigates perfectly by sound and psychic scent',
    'Wolfen features with a gentle expression, tail wagging at loyal customers',
    'Thick, layered clothing from their cold homeworld, looking overdressed',
    'Nose twitches constantly, cataloging every customer by their unique scent',
    'Deep, howling laugh that startles first-time customers',
    'Fluffy ears that perk up at the sound of credits changing hands',
    'Heavily bundled even in warm stations, homesick for the ice',
  ],
  witchwyrd: [
    'Four arms draped in shimmering robes, each hand holding a different artifact',
    'Blue-gray skin and pupilless white eyes that evaluate everything as merchandise',
    'An air of ancient mercantile wisdom, as if they invented the concept of trade',
    'Each of their four hands wears rings from different planetary traditions',
    'Speaks every trade language fluently and switches between them mid-sentence',
    'Their robes seem to contain an impossible number of hidden pockets',
    'A calm, unflappable demeanor — they\'ve seen every scam in the galaxy',
    'Force bolts crackle faintly in their palms when they sense dishonesty',
  ],
  xenodruid: [
    'Living vines woven through their hair, small flowers blooming at their temples',
    'Bark-like skin with bioluminescent moss growing in the creases',
    'Eyes like deep forest pools, reflecting an inner connection to nature',
    'Carries the scent of alien forests — petrichor and strange pollens',
    'Small symbiotic creatures nest in their clothing, occasionally peeking out',
    'Fungal network patterns trace across their skin, pulsing gently',
    'Leaves and small branches sprout from unlikely places on their body',
    'Their presence makes nearby plants visibly perk up and lean toward them',
  ],
  ysoki: [
    'Twitchy-whiskered with bright beady eyes, cheek pouches visibly stuffed',
    'Tiny but commanding, standing on a crate behind the counter for height',
    'Fur in patches of brown and white, nose constantly sniffing at new stock',
    'Oversized ears that swivel independently toward different conversations',
    'Tail wrapped around a tool or datapad at all times, a fifth hand',
    'Wearing a bandolier of pouches across their chest, each meticulously labeled',
    'Chattering teeth when excited, whiskers vibrating at supersonic speeds',
    'Small, quick hands that can disassemble and reassemble stock blindfolded',
  ],
}

// ===== PRICING TENDENCIES =====

const PRICING_TENDENCIES: { tendency: PricingTendency; label: string; weight: number }[] = [
  { tendency: 'fair', label: 'Fair Dealer — standard prices', weight: 4 },
  { tendency: 'haggler', label: 'Haggler — enjoys negotiation, flexible on price', weight: 3 },
  { tendency: 'overcharger', label: 'Overcharger — prices run 10-20% high', weight: 2 },
  { tendency: 'discount', label: 'Discount Dealer — prices run 5-15% low', weight: 2 },
  { tendency: 'gouger', label: 'Price Gouger — monopoly pricing, 25%+ markup', weight: 1 },
]

// ===== SPECIALTY KNOWLEDGE =====

const SPECIALTY_KNOWLEDGE: Record<ShopType, string[]> = {
  general: [
    'Knows which supplies are running low across the station',
    'Can source almost anything given enough time and credits',
    'Has a sixth sense for what new arrivals will need',
    'Keeps a mental inventory of every item in stock',
    'Knows the supply routes and when shipments arrive',
    'Can appraise any item at a glance with frightening accuracy',
    'Has contacts in every trade guild across the Pact Worlds',
    'Remembers every transaction for the past decade',
  ],
  weapons: [
    'Can identify any weapon\'s manufacturer by sound alone',
    'Knows the exact maintenance schedule for every weapon sold',
    'Tests every weapon personally before putting it on the shelf',
    'Has encyclopedic knowledge of weapon modifications',
    'Can recommend the perfect sidearm for any combat style',
    'Maintains detailed records of every weapon\'s kill count (if known)',
    'Knows which weapons are restricted in which systems',
    'Used to be a weapons designer before going retail',
  ],
  armor: [
    'Can fit custom armor by eye measurement alone',
    'Knows the weak points of every armor model on the market',
    'Keeps up with the latest protective tech from Verces and Aballon',
    'Has tested armor personally in combat situations',
    'Can recommend environmental modifications for any atmosphere',
    'Knows which armor holds up best against specific damage types',
    'Has connections with military surplus dealers across the system',
    'Maintains a repair shop in the back for armor modifications',
  ],
  tech: [
    'Can diagnose any tech malfunction by the sound it makes',
    'Builds custom modifications that aren\'t available anywhere else',
    'Has a network of hackers who beta-test new gear',
    'Knows the firmware versions and patch history of every device',
    'Can jailbreak restricted tech — for an additional fee, of course',
    'Keeps a workshop in the back for custom installations',
    'Has contacts at every major tech manufacturer',
    'Subscribes to seventeen tech journals and reads them all',
  ],
  medical: [
    'Former field medic with extensive trauma experience',
    'Knows drug interactions that even doctors sometimes miss',
    'Can recommend treatment protocols for exotic alien biologies',
    'Maintains cold storage for biologicals at exact specifications',
    'Has pharmaceutical contacts that expedite rare prescriptions',
    'Knows which serums pair well and which are dangerous together',
    'Keeps detailed logs of efficacy reports from actual field use',
    'Can apply basic medical augmentations on-site',
  ],
  grenades: [
    'Knows blast radii and shrapnel patterns from personal experience',
    'Can custom-load grenades for specific tactical situations',
    'Tests every batch personally — the scorch marks prove it',
    'Has a demolitions background with professional certification',
    'Knows local regulations on explosive ordnance by heart',
    'Can recommend the right payload for any structural challenge',
    'Maintains a blast-proof testing range behind the shop',
    'Keeps a respectful distance from the stock — learned that lesson early',
  ],
  magic: [
    'Can sense the aura of magical items without casting detect magic',
    'Knows the provenance of every enchanted item in stock',
    'Has studied under mystics across three different traditions',
    'Can identify cursed items before they\'re even unwrapped',
    'Maintains a sanctified storage area for volatile magical goods',
    'Knows which spells are encoded in every spell gem by touch',
    'Has connections to ley line researchers and planar scholars',
    'Can recommend magical solutions to mundane problems',
  ],
  blackmarket: [
    'Knows every back channel and dead drop in the sector',
    'Can acquire restricted goods with plausible deniability',
    'Has contacts in customs who look the other way for a fee',
    'Knows which serial numbers are flagged and how to scrub them',
    'Maintains an escape route from the shop — just in case',
    'Can verify the authenticity of goods others claim are stolen',
    'Has a reputation that precedes them in the underworld',
    'Knows exactly who to bribe and how much they cost',
  ],
}

// ===== SHOP RELATIONSHIPS =====

const SHOP_RELATIONSHIPS = [
  'Inherited the shop from a mentor who vanished under mysterious circumstances',
  'Built the business from nothing, starting with a single cart',
  'Won the shop in a card game and decided to make a go of it',
  'Franchise operator, technically works for a corporate chain',
  'Runs the shop as a cover for their real occupation',
  'Co-owns with a silent partner they\'ve never actually met',
  'Took over when the previous owner couldn\'t pay their debts',
  'Founded the shop as a community service, profit is secondary',
  'Former customer who bought out the retiring owner',
  'Assigned to the shop by their clan or community leaders',
  'The shop is mobile — they move it to wherever demand is highest',
  'Has been running this shop so long, no one remembers a time before',
]

// ===== FLAVOR TEXT TEMPLATES =====

function aAn(word: string): string {
  return /^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`
}

const FLAVOR_TEMPLATES = [
  (name: string, ancestry: string) =>
    `${name} is ${aAn(ancestry)} shopkeeper known for their sharp eye and sharper tongue. Regulars know to come early — the best stock goes fast.`,
  (name: string, ancestry: string) =>
    `Behind the cluttered counter, ${name} — a weathered ${ancestry} — sorts inventory with the precision of someone who knows every item's story.`,
  (name: string, ancestry: string) =>
    `The shop belongs to ${name}, ${aAn(ancestry)} who greets every customer like an old friend and every thief like a personal challenge.`,
  (name: string, ancestry: string) =>
    `${name}, ${aAn(ancestry)} merchant of some repute, runs this establishment with a mix of genuine passion and calculated shrewdness.`,
]

// ===== GENERATOR FUNCTIONS =====

function pickWeighted<T>(items: { value: T; weight: number }[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let r = Math.random() * total
  for (const item of items) {
    r -= item.weight
    if (r <= 0) return item.value
  }
  return items[items.length - 1]!.value
}

function pickAncestry(): SF2eAncestry {
  return pickWeighted(
    ALL_ANCESTRIES.map(a => ({ value: a, weight: ANCESTRY_WEIGHTS[a] }))
  )
}

export function generateNPCName(ancestry: SF2eAncestry): string {
  const table = NAME_TABLES[ancestry]
  const first = pick(table.first)
  if (table.surnames && Math.random() < 0.7) {
    return `${first} ${pick(table.surnames)}`
  }
  return first
}

export function generateShopkeeper(shopType?: ShopType): GeneratedNPC {
  const ancestry = pickAncestry()
  const name = generateNPCName(ancestry)
  const ancestryLabel = ANCESTRY_LABELS[ancestry]

  const pricing = pickWeighted(
    PRICING_TENDENCIES.map(p => ({ value: p, weight: p.weight }))
  )

  const specialtyPool = shopType && SPECIALTY_KNOWLEDGE[shopType]
    ? SPECIALTY_KNOWLEDGE[shopType]
    : SPECIALTY_KNOWLEDGE.general

  const flavorFn = pick(FLAVOR_TEMPLATES)

  return {
    name,
    ancestry,
    ancestryLabel,
    disposition: pick(DISPOSITIONS),
    motivation: pick(MOTIVATIONS),
    quirk: pick(QUIRKS),
    secret: pick(SECRETS),
    appearance: pick(APPEARANCE_TEMPLATES[ancestry]),
    pricingTendency: pricing.tendency,
    pricingLabel: pricing.label,
    specialtyKnowledge: pick(specialtyPool),
    shopRelationship: pick(SHOP_RELATIONSHIPS),
    flavorText: flavorFn(name, ancestryLabel),
  }
}

export function npcToText(npc: GeneratedNPC): string {
  let text = `## Shopkeeper: ${npc.name}\n`
  text += `**Ancestry:** ${npc.ancestryLabel}\n`
  text += `**Appearance:** ${npc.appearance}\n`
  text += `**Disposition:** ${npc.disposition}\n`
  text += `**Motivation:** ${npc.motivation}\n`
  text += `**Quirk:** ${npc.quirk}\n`
  text += `**Pricing:** ${npc.pricingLabel}\n`
  text += `**Specialty:** ${npc.specialtyKnowledge}\n`
  text += `**Role:** ${npc.shopRelationship}\n`
  text += `**Secret:** ${npc.secret}\n\n`
  text += `> ${npc.flavorText}\n`
  return text
}
