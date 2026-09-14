(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ReferenceData = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var PURPOSES = ['Enchantment', 'Evocation', 'Familiar/Summoning', 'Bailiwick', 'Boon'];

  var RUNES = [
    {name:'Chaos',        group:'Consequential', color:'#a78bfa'},
    {name:'Zenith',       group:'Soul',          color:'#f9a8d4'},
    {name:'Nadir',        group:'Soul',          color:'#c084fc'},
    {name:'Genesis',      group:'Soul',          color:'#4ade80'},
    {name:'Coda',         group:'Soul',          color:'#92400e'},
    {name:'Aether',       group:'Soul',          color:'#6ee7b7'},
    {name:'Vigour',       group:'Magic',         color:'#e5e7eb'},
    {name:'Lethargy',     group:'Magic',         color:'#374151'},
    {name:'Potency',      group:'Magic',         color:'#9ca3af'},
    {name:'Cognizance',   group:'Maintenance',   color:'#e879f9'},
    {name:'Perpetuation', group:'Maintenance',   color:'#fde047'},
    {name:'Prime',        group:'Maintenance',   color:'#22d3ee'},
    {name:'Order',        group:'Maintenance',   color:'#f87171'},
    {name:'Ruin',         group:'Magicless',     color:'#60a5fa'},
    {name:'Refuge',       group:'Magicless',     color:'#fb923c'},
    {name:'Mimicry',      group:'Deific',        color:'#d1d5db'},
    {name:'Elegance',     group:'Deific',        color:'#d1fae5'},
    {name:'Potential',    group:'Deific',        color:'#fef08a'},
    {name:'Carnage',      group:'Deific',        color:'#fca5a5'}
  ];

  var IGNORES = {
    'Chaos':        ['Cognizance','Perpetuation','Prime','Order'],
    'Zenith':       ['Nadir','Carnage'],
    'Nadir':        ['Zenith','Carnage'],
    'Genesis':      ['Coda','Carnage'],
    'Coda':         ['Genesis','Carnage'],
    'Aether':       [],
    'Vigour':       ['Lethargy'],
    'Lethargy':     ['Vigour'],
    'Potency':      ['Chaos','Ruin','Refuge','Mimicry','Elegance','Potential','Carnage'],
    'Cognizance':   ['Chaos','Carnage'],
    'Perpetuation': ['Chaos','Carnage'],
    'Prime':        ['Chaos','Carnage'],
    'Order':        ['Chaos','Mimicry','Elegance','Potential','Carnage'],
    'Ruin':         ['Carnage'],
    'Refuge':       ['Carnage'],
    'Mimicry':      ['Potency','Order','Elegance','Potential'],
    'Elegance':     ['Potency','Order','Mimicry','Carnage'],
    'Potential':    ['Potency','Order','Mimicry','Carnage'],
    'Carnage':      ['Zenith','Nadir','Coda','Genesis','Cognizance','Perpetuation','Prime','Order','Ruin','Refuge','Elegance','Potential']
  };

  var TIER_COLORS = {Low:'#6b7280', Mid:'#d97706', High:'#7c3aed', Adept:'#dc2626'};

  // All built-in components: {rune, tier, name, desc}
  var COMPONENTS = [
    // Chaos
    {rune:'Chaos',tier:'Low',name:'Chaotic Objects',desc:'No set structure; changes randomly. Cannot alter mass.'},
    {rune:'Chaos',tier:'Low',name:'Mislocation',desc:'System instantly relocates to a random point nearby.'},
    {rune:'Chaos',tier:'Low',name:'Uncertainty',desc:'System gains a new random reaction to a stimuli.'},
    {rune:'Chaos',tier:'Low',name:'Alteration',desc:'One attribute or behaviour changed to something random.'},
    {rune:'Chaos',tier:'Low',name:'Nuclear',desc:'System undergoes radioactive decay at a random rate.'},
    {rune:'Chaos',tier:'Mid',name:'Rainbow Stone',desc:'Multi-coloured material; unlikely interactions become more likely nearby.'},
    {rune:'Chaos',tier:'Mid',name:'Lucky Stars',desc:'Contact grants favourable advantage in matters of probability.'},
    {rune:'Chaos',tier:'High',name:'Chaos Window',desc:'Gap in reality; imparts mislocation, uncertainty, alteration, and decay on nearby systems.'},
    // Zenith
    {rune:'Zenith',tier:'Low',name:'Perfect Marble',desc:'Smooth but grippy. Hitting it causes no damage and very little pain.'},
    {rune:'Zenith',tier:'Low',name:'Inexorable Light',desc:'Illuminates through obstacles; gives a pleasant warm feeling.'},
    {rune:'Zenith',tier:'Low',name:'Rose Cake',desc:'Edible; provides all nutrition, tastes delicious, favourable texture.'},
    {rune:'Zenith',tier:'Low',name:'Liquid Rose',desc:'Drinkable; provides all nutrition, tastes delicious, favourable texture.'},
    {rune:'Zenith',tier:'Mid',name:'Kunzite Flowers',desc:'Pink ground flowers; absorb impacts, difficult to damage, pleasant aroma.'},
    {rune:'Zenith',tier:'Mid',name:'Cloud Deck',desc:'Pink-tinted gas; passable from most directions but supports weight from above.'},
    {rune:'Zenith',tier:'High',name:'Pacify',desc:'Entities in the area become calmer; negative thoughts gently disregarded.'},
    {rune:'Zenith',tier:'Adept',name:'Dawn Veil',desc:'Pink/white sky-light; immunity to physical damage and illness, blocks aggressors.'},
    // Nadir
    {rune:'Nadir',tier:'Low',name:'Perfect Obsidian',desc:'Smooth but grippy. Hitting it causes no damage but far greater pain.'},
    {rune:'Nadir',tier:'Low',name:'Obdurate Shade',desc:'Blocks all light; gives an unpleasant cold feeling without removing heat.'},
    {rune:'Nadir',tier:'Low',name:'Leaded Root',desc:'Edible; provides all nutrition, tastes revolting, unfavourable texture.'},
    {rune:'Nadir',tier:'Low',name:'Liquid Lead',desc:'Drinkable; provides all nutrition, tastes revolting, unfavourable texture.'},
    {rune:'Nadir',tier:'Mid',name:'Palatinate Water',desc:'Dark purple non-Newtonian fluid; becomes more viscous and sticky when struck.'},
    {rune:'Nadir',tier:'Mid',name:'Smouldering Sand',desc:'Dark purple granular material; feels far hotter than its ambient temperature.'},
    {rune:'Nadir',tier:'High',name:'Distress',desc:'Entities feel pain with no physical damage; entirely mentally induced.'},
    {rune:'Nadir',tier:'Adept',name:'Dissection',desc:'Systems within have their behaviour, function, or structure reductively altered.'},
    // Genesis
    {rune:'Genesis',tier:'Low',name:'Viridescent Glass',desc:'Glass vine moving away from ritual; heals nearby entities as its colour fades.'},
    {rune:'Genesis',tier:'Low',name:'Pestilent Mist',desc:'Green/yellow mist carrying Genesic bacteria with wildly varying effects.'},
    {rune:'Genesis',tier:'Low',name:'Growth',desc:'Entities grow larger/stronger in some aspect; can push past natural limits.'},
    {rune:'Genesis',tier:'Mid',name:'Tower Brick',desc:'Mud-like material; nearby plants/fungi grow and reproduce far more quickly.'},
    {rune:'Genesis',tier:'Mid',name:'Vernal Moss',desc:'Nutritional moss that grows only on entities; dies if touching objects too long.'},
    {rune:'Genesis',tier:'High',name:'Pseudo-Soul',desc:'Dark green gas; reanimates a deceased body with limited faculties.'},
    {rune:'Genesis',tier:'Adept',name:'Soul',desc:'Glowing dark green gas; fully reanimates a deceased body.'},
    // Coda
    {rune:'Coda',tier:'Low',name:'Hungry Briar',desc:'Thorny vine moving away from ritual; turns toward nearby entities.'},
    {rune:'Coda',tier:'Low',name:'Baleful Mist',desc:'Brown/red mist carrying Codic viruses with wildly varying effects.'},
    {rune:'Coda',tier:'Low',name:'Deteriorate',desc:'Entity experiences accelerated decay toward its end; vital systems affected most.'},
    {rune:'Coda',tier:'Mid',name:'Mausoleum Brick',desc:'Stone-like material; nearby plants/fungi wither and die far more quickly.'},
    {rune:'Coda',tier:'Mid',name:'Autumnal Leaves',desc:'Degrades biological matter in objects; hurts entities but does not degrade them.'},
    {rune:'Coda',tier:'High',name:'De-animate',desc:'Halts all internal functions in plants, animals, or moving-part objects. Form undamaged.'},
    {rune:'Coda',tier:'Adept',name:'Death',desc:'Any entity fully encompassed for a period dies instantly. Form undamaged.'},
    // Aether
    {rune:'Aether',tier:'Low',name:'Ghost Fire',desc:'Green flame; does not burn or feel hot, but exerts a pushing force.'},
    {rune:'Aether',tier:'Low',name:'Spirit Bridge',desc:'Connects two places via the Spirit world for instantaneous travel.'},
    {rune:'Aether',tier:'Low',name:'Wisps',desc:'Green flame bodies with no physical presence; fly toward and dance around a target.'},
    {rune:'Aether',tier:'Mid',name:'Incorporeal',desc:'Systems become incorporeal; masses can pass through one another.'},
    {rune:'Aether',tier:'High',name:'Perish Glass',desc:'Sturdy green translucent material; interacts with Spirit and Material worlds; releases Ghost Fire when broken.'},
    {rune:'Aether',tier:'Adept',name:'Judgement',desc:'Effect varies based on the ritualist\'s moral judgement of the target as good or bad.'},
    // Potency
    {rune:'Potency',tier:'Low',name:'Magic Winds',desc:'Repulsive force expelled into Primal Space; only affects magical energy there.'},
    {rune:'Potency',tier:'Low',name:'Magic Ichor',desc:'Grey glowing liquid; can fuel a ritual lacking magical energy.'},
    {rune:'Potency',tier:'Low',name:'Catalyst',desc:'Amplifies nearby rituals; primes and activates them; supplies missing energy.'},
    {rune:'Potency',tier:'Low',name:'Magical Energy',desc:'Brings raw magical energy into the Material world; reacts destructively.'},
    {rune:'Potency',tier:'Mid',name:'Substantiation',desc:'Materialises Primal Space energy as safe grey strands in the Material world.'},
    {rune:'Potency',tier:'Mid',name:'Arcane Lattice',desc:'Grey erratic crystal with dark liquid inside that reacts violently to atmosphere.'},
    {rune:'Potency',tier:'High',name:'Spliced Magic',desc:'Black and white liquid; explodes violently near large quantities of magical energy.'},
    // Vigour
    {rune:'Vigour',tier:'Low',name:'Heating',desc:'Intense temperature increase in the area.'},
    {rune:'Vigour',tier:'Low',name:'Hearth Fire',desc:'Low-temp white flame that is hard to extinguish; charges nearby energy-requiring objects.'},
    {rune:'Vigour',tier:'Low',name:'Motivation',desc:'Internal functions hastened; to the system the world slows down.'},
    {rune:'Vigour',tier:'Low',name:'Energy Stone',desc:'White reflective material; repels all energy, shatters after enough repulsion.'},
    {rune:'Vigour',tier:'Mid',name:'Liquid Summer',desc:'White liquid (cannot change state); incredibly hot, quickly absorbs energy.'},
    {rune:'Vigour',tier:'High',name:'Assist',desc:'Rituals activated in this area have their throughput increased.'},
    {rune:'Vigour',tier:'Adept',name:'Escalation',desc:'Temperature rises; all rituals in area activated; ongoing effects gain energy.'},
    // Lethargy
    {rune:'Lethargy',tier:'Low',name:'Cooling',desc:'Intense temperature drop in the area.'},
    {rune:'Lethargy',tier:'Low',name:'Sub-zero Mist',desc:'Black ice crystals at absolute zero; absorbs energy only; vanishes at a threshold.'},
    {rune:'Lethargy',tier:'Low',name:'Drag',desc:'Internal functions slowed; to the system the world speeds up.'},
    {rune:'Lethargy',tier:'Low',name:'Energy Sink',desc:'Black rough material; absorbs all energy, shatters after enough absorption.'},
    {rune:'Lethargy',tier:'Mid',name:'Liquid Winter',desc:'Black liquid (cannot change state); incredibly cold, quickly emits energy outward.'},
    {rune:'Lethargy',tier:'High',name:'Restrict',desc:'Rituals activated in this area have their throughput decreased.'},
    {rune:'Lethargy',tier:'Adept',name:'Negation',desc:'Temperature drops; ritual energy frozen in place; ongoing effects drained.'},
    // Cognizance
    {rune:'Cognizance',tier:'Low',name:'Dream Essence',desc:'Multi-colour mist; inhaled to elicit specific dreams based on colour.'},
    {rune:'Cognizance',tier:'Low',name:'Slumber',desc:'Affected systems that can sleep begin to do so; cannot leave sleep state while active.'},
    {rune:'Cognizance',tier:'Low',name:'Communicate',desc:'Sends a message to another entity; method varies per ritual.'},
    {rune:'Cognizance',tier:'Low',name:'Real Phantasy',desc:'Solid substance taking on a form and colour from nearby dreams; mimics form\'s abilities.'},
    {rune:'Cognizance',tier:'Mid',name:'Scramble',desc:'Randomly scrambles all readable information in the area into unreadable form.'},
    {rune:'Cognizance',tier:'High',name:'Prime Orders',desc:'Sends instructions to an object with operational parts or an animalistic entity.'},
    {rune:'Cognizance',tier:'Adept',name:'Tribunal Orders',desc:'Sends instructions to any entity; entity is compelled to carry them out.'},
    // Perpetuation
    {rune:'Perpetuation',tier:'Low',name:'Restoration',desc:'System reverts toward a previous optimal state; cannot create matter.'},
    {rune:'Perpetuation',tier:'Low',name:'World Fabric',desc:'Invisible fabric; systems inside have doubled mass and doubled force acting on them.'},
    {rune:'Perpetuation',tier:'Low',name:'Yellow Nerves',desc:'Yellow branch-like structure; latches onto systems; glows when specific acts are performed nearby.'},
    {rune:'Perpetuation',tier:'Mid',name:'Ochre Box',desc:'Yellow cube; consequential ritual energy enters but cannot leave; destroyed inside.'},
    {rune:'Perpetuation',tier:'Mid',name:'Surface Razor',desc:'Atomically thin metal; cuts through any object when angled correctly.'},
    {rune:'Perpetuation',tier:'High',name:'Collapse',desc:'Space-time compressed; systems get closer without being compressed themselves.'},
    {rune:'Perpetuation',tier:'High',name:'Expand',desc:'Space-time expanded; systems get further apart without expanding themselves.'},
    {rune:'Perpetuation',tier:'Adept',name:'Reclamation Energy',desc:'Consequential ritual energy reconstructed into recycled energy; has physical form.'},
    // Prime
    {rune:'Prime',tier:'Low',name:'Night Shroud',desc:'Cyan translucent veil; systems exiting return to their state and location before entering.'},
    {rune:'Prime',tier:'Low',name:'Biblite',desc:'Transparent cyan crystal; absorbs and translates Cartularian components.'},
    {rune:'Prime',tier:'Low',name:'Transfer',desc:'Sends a message from one system to another; method varies per ritual.'},
    {rune:'Prime',tier:'Mid',name:'Red Cartularian',desc:'Glowing red text around consequential systems; can be disrupted by other entities.'},
    {rune:'Prime',tier:'Mid',name:'Cartularian',desc:'Glowing blue text around affected systems; thoughts and speech transliterated.'},
    {rune:'Prime',tier:'High',name:'Liber Steel',desc:'Metal that extracts and burns information onto its surface; interacts with Cartularian text.'},
    {rune:'Prime',tier:'Adept',name:'Cartularian Tablet',desc:'Large biblite slab holding up to twelve layers of Cartularian text; always same size.'},
    // Order
    {rune:'Order',tier:'Low',name:'Red Thread',desc:'Latches onto and restrains nearby entities; vanishes after enough force.'},
    {rune:'Order',tier:'Low',name:'Warden-Light',desc:'Red spotlight; systems within are slowed and have all movement impeded.'},
    {rune:'Order',tier:'Low',name:'Amber Neurotoxin',desc:'Gold/orange viscous liquid that solidifies; paralyses covered area until cleaned.'},
    {rune:'Order',tier:'Mid',name:'Deprive',desc:'Cuts off some senses from entities in the area; also affects sensor-using systems.'},
    {rune:'Order',tier:'Mid',name:'Cut-off Field',desc:'Blocks force fields from extending into the area; electromagnetism, gravity, and magical forces.'},
    {rune:'Order',tier:'High',name:'Universal Veil',desc:'Black untouchable substance on reality\'s fabric; cuts off fully concealed systems from all external influence.'},
    // Ruin
    {rune:'Ruin',tier:'Low',name:'Stellar Mist',desc:'Blue/green/purple/black mist; propels ruinous systems with considerable force.'},
    {rune:'Ruin',tier:'Low',name:'Ruinous Stars',desc:'Glowing white caltrop crystal; greatly amplifies any force exerted on a system.'},
    {rune:'Ruin',tier:'Low',name:'Celestial Power',desc:'Visible blue stellar energy beam; highly destructive to all systems.'},
    {rune:'Ruin',tier:'Mid',name:'Traitorous Mist',desc:'Darker Stellar Mist variant; effects producing it do not trigger the backfire-clause.'},
    {rune:'Ruin',tier:'Mid',name:'Star Way',desc:'Floating blue stream; catches and redirects any system or effect entering it.'},
    {rune:'Ruin',tier:'High',name:'Nova Flame',desc:'Blue/green/purple fire; burns physical matter, stellar energy, and magical energy.'},
    {rune:'Ruin',tier:'Adept',name:'Obliterate',desc:'Massive force directed away from nearest significant mass; stellar energy manifests throughout.'},
    // Refuge
    {rune:'Refuge',tier:'Low',name:'Terra Glass',desc:'Red/yellow/orange/white triangular glass; absorbs force before vanishing; connectable.'},
    {rune:'Refuge',tier:'Low',name:'Reinforce',desc:'Improves a system\'s resilience to stresses; fades gradually after leaving the area.'},
    {rune:'Refuge',tier:'Low',name:'Aegis Ley',desc:'Barrier on the area\'s outside; damage to barrier accelerates energy use.'},
    {rune:'Refuge',tier:'Mid',name:'Renegade Glass',desc:'Whiter Terra Glass variant; effects producing it do not trigger the backfire-clause.'},
    {rune:'Refuge',tier:'Mid',name:'Ley Streak',desc:'Fast-growing yellow triangle rod; may rebound off surfaces; pre-rebound section deteriorates.'},
    {rune:'Refuge',tier:'High',name:'Desiccated Sea',desc:'Red/yellow/orange polygon surface spreading across connected surfaces; burns magic and terrestrial energy to grow.'},
    {rune:'Refuge',tier:'Adept',name:'Petrify',desc:'Massive force directed toward nearest significant mass; terrestrial energy manifests throughout.'},
    // Mimicry
    {rune:'Mimicry',tier:'Low',name:'Copy',desc:'Affected systems take on the facade of a nearby system of similar dimensions.'},
    {rune:'Mimicry',tier:'Low',name:'Echo Gem',desc:'Transparent crystal; first charge records nearby sound; subsequent charges replay it.'},
    {rune:'Mimicry',tier:'Low',name:'Prison Glass',desc:'Reflective material; first charge records its reflection; subsequent charges replay it.'},
    {rune:'Mimicry',tier:'Mid',name:'Faux Mirror',desc:'Silver reflective material; systems can enter their reflection; exit only via another reflective surface.'},
    {rune:'Mimicry',tier:'Mid',name:'Mimic Blood',desc:'Silver liquid metal; takes on the form of a nearby system and solidifies somewhat.'},
    {rune:'Mimicry',tier:'High',name:'Reflected Reality',desc:'Effects act on reflections, which by connection influence the true system.'},
    // Elegance
    {rune:'Elegance',tier:'Low',name:'Resonance',desc:'Produces sound from the ritual.'},
    {rune:'Elegance',tier:'Low',name:'Light',desc:'Produces light from the ritual.'},
    {rune:'Elegance',tier:'Low',name:'Aroma',desc:'Produces a smell from the ritual.'},
    {rune:'Elegance',tier:'Low',name:'Sensation',desc:'Produces a feeling along the outside of the body.'},
    {rune:'Elegance',tier:'Mid',name:'Song Clothe',desc:'Silk-like vibrant fabric; incredibly stretchy and deceptively hard to tear.'},
    {rune:'Elegance',tier:'Mid',name:'Bell Rods',desc:'Translucent glass sticks; resonate a frequency based on their length when struck.'},
    {rune:'Elegance',tier:'High',name:'Bird Wood',desc:'Patterned wood; pleasant sound when struck, pleasant aroma, smooth to touch.'},
    // Potential
    {rune:'Potential',tier:'Low',name:'Charge',desc:'Electrical energy expelled as an arc.'},
    {rune:'Potential',tier:'Low',name:'Magnetism',desc:'Negative or positive magnetic force inside the area.'},
    {rune:'Potential',tier:'Low',name:'Electrostatic',desc:'Negative or positive electrical force inside the area.'},
    {rune:'Potential',tier:'Low',name:'Gravity',desc:'Positive gravitational force inside the area.'},
    {rune:'Potential',tier:'Low',name:'Atomic',desc:'Atomic structure of systems in the area can be altered.'},
    {rune:'Potential',tier:'Mid',name:'Optimise',desc:'Objects with a function inside the area have that function greatly improved.'},
    {rune:'Potential',tier:'High',name:'Tinker Spark',desc:'Erratic electricity bundle absorbed into an object; grants that object limited sentience.'},
    // Carnage
    {rune:'Carnage',tier:'Low',name:'Eradication',desc:'Affected system begins to erode; all eroded matter and energy ceases to exist.'},
    {rune:'Carnage',tier:'Low',name:'Dissidence',desc:'Systems in the area are disrupted; objects break, entities experience negative stimuli.'},
    {rune:'Carnage',tier:'Low',name:'Command',desc:'Entity\'s mental faculties assaulted; if successful, its mentality is changed.'},
    {rune:'Carnage',tier:'Mid',name:'Magic Fire',desc:'Colourless fire; leaves entities and objects unharmed but burns magical energy.'},
    {rune:'Carnage',tier:'Mid',name:'Dissenter\'s Net',desc:'Colourless orb; contacted reality ceases to exist and collapses into the net; destroyed net begins to reconstruct reality.'}
  ];

  function getTier(n) {
    if (n <= 4)  return 'Low';
    if (n <= 9)  return 'Mid';
    if (n <= 14) return 'High';
    return 'Adept';
  }

  return { PURPOSES: PURPOSES, RUNES: RUNES, IGNORES: IGNORES, TIER_COLORS: TIER_COLORS, COMPONENTS: COMPONENTS, getTier: getTier };
});
