export const AURUM = {
  brand: {
    name: 'LORUM',
    tagline: 'The Weight of Gold',
    intro: 'Enter the house where gold is poured, not worn.',
    manifesto: 'LORUM is a heritage of restraint, where every accord is aged like a fortune and worn like a secret. We compose for those who understand that true opulence never announces itself, it lingers.',
    craftStory: 'Each composition is matured in oak and crystal over the slow turn of seasons, blended by a single master nose in a vaulted atelier. We source resins by hand, distill in small batches, and decant only when the scent has earned its name. Nothing is rushed, because gold is never in a hurry.',
    closingLine: 'Possess what cannot be borrowed.',
    seoTitle: 'LORUM | Heritage Luxury Perfume House',
    seoDescription: 'LORUM is a heritage luxury perfume house composing five rare fragrances of amber, spice, leather, and gold. Sensual, restrained, and made for those who wear opulence like a secret.'
  },
  palette: {
    bg: '#070504',
    bg2: '#0d0907',
    ink: '#f3ede0',
    inkDim: '#a99e88',
    gold: '#c8a14e',
    goldBright: '#ecc878',
    goldDeep: '#7c5e26',
    amber: '#c8772f'
  },
  perfumes: [
    {
      id: 'noctis-aurum',
      name: 'Noctis Lorum',
      subtitle: 'Amber Oriental Opulence',
      accord: 'Warm amber oriental with spiced resins',
      notesTop: ['Black Saffron', 'Bitter Cardamom', 'Candied Plum'],
      notesHeart: ['Turkish Rose', 'Smoked Incense', 'Cinnamon Bark'],
      notesBase: ['Aged Amber', 'Labdanum', 'Myrrh', 'Vanilla Absolute'],
      story: 'The flagship of the house, poured in the dark hours when resins surrender their deepest warmth. Black saffron melts into aged amber and labdanum, a scent matured slow enough to feel like firelight on skin. To wear it is to carry a private dusk that never fully fades.',
      model: 'assets/models/bottle-01.glb',
      accent: '#c8772f',
      liquidColor: '#7a2f12'
    },
    {
      id: 'ferrum-noir',
      name: 'Ferrum Noir',
      subtitle: 'Woody Aromatic Power',
      accord: 'Bold woody-aromatic with leather and pepper',
      notesTop: ['Crushed Black Pepper', 'Wormwood', 'Juniper'],
      notesHeart: ['Haitian Vetiver', 'Clary Sage', 'Geranium'],
      notesBase: ['Smoked Leather', 'Patchouli', 'Oakmoss', 'Cedarwood'],
      story: 'Forged for the hand that does not flinch, vetiver and black pepper cut through a core of smoked leather. The composition is aged against oakmoss until it reads like polished iron warmed by the body. This is masculine power held quietly, never raised.',
      model: 'assets/models/bottle-02.glb',
      accent: '#9a7a3a',
      liquidColor: '#2e2a1c'
    },
    {
      id: 'velours-or',
      name: 'Velours Or',
      subtitle: 'Refined Classic Luxury',
      accord: 'Suede and tobacco with golden amber',
      notesTop: ['Bergamot', 'Pink Pepper', 'Saffron Thread'],
      notesHeart: ['Honeyed Tobacco', 'Orris Suede', 'Jasmine'],
      notesBase: ['Bourbon Vanilla', 'Golden Amber', 'Tonka Bean', 'Sandalwood'],
      story: 'A study in old-world refinement, where honeyed tobacco folds into orris suede like a glove kept for decades. Bourbon vanilla and golden amber settle into the skin with the ease of inherited wealth. It is luxury that whispers in a language only the wearer understands.',
      model: 'assets/models/bottle-03.glb',
      accent: '#c8a14e',
      liquidColor: '#a86a28'
    },
    {
      id: 'lume-vif',
      name: 'Lume Vif',
      subtitle: 'Fresh Spicy Modern',
      accord: 'Fresh-spicy with ambroxan and cedar',
      notesTop: ['Calabrian Bergamot', 'Sichuan Pepper', 'Pink Grapefruit'],
      notesHeart: ['Lavender Absolute', 'Nutmeg', 'Cardamom'],
      notesBase: ['Ambroxan', 'Virginia Cedar', 'White Musk', 'Vetiver'],
      story: 'The modern heir of the house, where Sichuan pepper sparks against cool ambroxan and cedar. Calabrian bergamot lifts the opening into clean morning light before the spice settles into skin-warm wood. Restraint sharpened to a blade, contemporary yet unmistakably ours.',
      model: 'assets/models/bottle-04.glb',
      accent: '#b8923f',
      liquidColor: '#caa24e'
    },
    {
      id: 'soleil-clair',
      name: 'Soleil Clair',
      subtitle: 'Radiant Citrus Opener',
      accord: 'Luminous neroli citrus with soft musk',
      notesTop: ['Bitter Orange', 'Sicilian Bergamot', 'Petitgrain'],
      notesHeart: ['Neroli', 'Orange Blossom', 'Green Mandarin'],
      notesBase: ['White Musk', 'Blonde Woods', 'Amber Crystal'],
      story: 'The daylight of the collection, opened with bitter orange and neroli pressed from the first blossom of the season. Petitgrain and soft musk carry it across the skin like sun moving over stone. Bright, sensual, and clean, it is the radiant overture to the house of gold.',
      model: 'assets/models/bottle-05.glb',
      accent: '#ecc878',
      liquidColor: '#e8c25e'
    }
  ],
  nav: [
    { label: 'Collection', href: '#collection' },
    { label: 'Craft', href: '#craft' },
    { label: 'House', href: '#hero' },
    { label: 'Discover', href: '#closing' }
  ],
  seo: {
    title: 'LORUM | Heritage Luxury Perfume House',
    description: 'LORUM is a heritage luxury perfume house composing five rare fragrances of amber, spice, leather, and gold. Sensual, restrained, and made for those who wear opulence like a secret.'
  }
};

export const LORUM = AURUM;
